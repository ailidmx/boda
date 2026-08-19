// ── Guest Editor Modal ─────────────────────────────────────────────────
//
// This module owns the "✏️ Editar" modal for a single guest: it renders the
// form, handles the Cloudinary avatar upload, and persists the edited fields
// through the injected repository. It is a presentation module — it never
// touches Firestore directly; all writes go through the injected `updateGuest`
// repository function and the shared `buildDashboardGuestEditPayload` builder.

// Cloudinary unsigned upload config (mirrors the invitation's uploadAvatar).
const AVATAR_CLOUD_NAME = "k2ajcgxv";
const AVATAR_UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "boda_avatars_unsigned";
const AVATAR_FOLDER = "boda/avatars";

/**
 * Upload an avatar image to Cloudinary (boda/avatars) and return its public id.
 * Runs client-side via the unsigned preset; requires the preset to be enabled
 * in the Cloudinary dashboard.
 *
 * @param {File} file The image file picked by the admin.
 * @returns {Promise<string>} The Cloudinary public id.
 */
async function uploadAvatarToCloudinary(file) {
  if (!file) throw new Error("No file selected");
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  if (file.size > 8 * 1024 * 1024) throw new Error("Image is too large (max 8 MB)");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", AVATAR_UPLOAD_PRESET);
  formData.append("folder", AVATAR_FOLDER);

  const endpoint = `https://api.cloudinary.com/v1_1/${AVATAR_CLOUD_NAME}/image/upload`;
  const response = await fetch(endpoint, { method: "POST", body: formData });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Upload failed (${response.status}) ${text}`);
  }
  const data = await response.json();
  if (!data?.public_id) throw new Error("Upload failed: no public id returned");
  return data.public_id;
}

/**
 * Open the guest editor modal for a single guest.
 *
 * @param {object} guest The guest record to edit.
 * @param {object} ctx Injected dependencies (see dashboard.js adapter).
 */
export function openGuestEditor(guest, ctx) {
  const {
    guestAvatarUrl,
    guestInitials,
    buildDashboardGuestEditPayload,
    updateGuest,
    getGuest,
  } = ctx;

  // Gender stores "M" (Mujer) or "H" (Hombre); age stores "Adulto" or "Niño".
  // The dropdowns show friendly labels (with emoji for gender) but the payload
  // sends the real stored values.
  const gender = guest.identity?.gender || guest.gender || "";
  const age = guest.identity?.age || guest.age || "";

  const overlay = document.createElement("div");

  overlay.className = "dashboard-modal-overlay";
  overlay.innerHTML = `
    <div class="dashboard-modal">
      <div class="dashboard-modal-heading">
        <h3>Editar invitado</h3>
        <button class="dashboard-modal-close" data-modal-close type="button">✕</button>
      </div>
      <form class="dashboard-modal-form" data-guest-form>
        <input type="hidden" name="id" value="${guest.id}" />

        <div class="dashboard-modal-field">
          <label for="edit-firstName">Nombre</label>
          <input id="edit-firstName" name="firstName" value="${guest.identity?.firstName || guest.firstName || ""}" required />
        </div>

        <div class="dashboard-modal-field">
          <label for="edit-middleName">Nombre 2</label>
          <input id="edit-middleName" name="middleName" value="${guest.identity?.middleName || guest.middleName || guest.nombre2 || ""}" />
        </div>

        <div class="dashboard-modal-field">
          <label for="edit-lastName">Apellido</label>
          <input id="edit-lastName" name="lastName" value="${guest.identity?.lastName || guest.lastName || ""}" />
        </div>

        <div class="dashboard-modal-field">
          <label for="edit-maternalLastName">Apellido 2</label>
          <input id="edit-maternalLastName" name="maternalLastName" value="${guest.identity?.maternalLastName || guest.maternalLastName || guest.apellido2 || ""}" />
        </div>

        <div class="dashboard-modal-field">
          <label for="edit-gender">Género</label>
          <select id="edit-gender" name="gender">
            <option value="" ${!gender ? "selected" : ""}>—</option>
            <option value="M" ${gender === "M" ? "selected" : ""}>👩 Mujer</option>
            <option value="H" ${gender === "H" ? "selected" : ""}>👨 Hombre</option>
          </select>
        </div>

        <div class="dashboard-modal-field">
          <label for="edit-age">Edad</label>
          <select id="edit-age" name="age">
            <option value="" ${!age ? "selected" : ""}>—</option>
            <option value="Adulto" ${age === "Adulto" ? "selected" : ""}>Adulto</option>
            <option value="Niño" ${age === "Niño" ? "selected" : ""}>Niño</option>
          </select>
        </div>


        <div class="dashboard-modal-field">
          <label>Foto de perfil</label>
          <div class="dashboard-avatar-upload">
            <span class="dashboard-avatar-upload-preview" data-avatar-preview>
              ${guestAvatarUrl(guest)
                ? `<img src="${guestAvatarUrl(guest)}" alt="Foto actual" />`
                : `<span class="dashboard-avatar-upload-placeholder">${guestInitials(guest)}</span>`}
            </span>
            <div class="dashboard-avatar-upload-controls">
              <label class="dashboard-button dashboard-button-secondary dashboard-avatar-upload-btn" for="edit-avatar-file">
                📷 Subir foto
              </label>
              <input id="edit-avatar-file" name="avatarFile" type="file" accept="image/*" hidden />
              <small data-avatar-upload-status style="color:#8a7a5f;display:block;margin-top:0.25rem;">
                Se subirá a Cloudinary (carpeta boda/avatars) y se guardará el ID.
              </small>
            </div>
          </div>
          <input id="edit-identityCloudinaryId" name="identityCloudinaryId" value="${guest.identity?.cloudinaryId || guest.cloudinaryId || ""}"
            placeholder="O pega un Cloudinary ID manualmente" style="margin-top:0.5rem;" />
        </div>


        <div class="dashboard-modal-field">
          <label for="edit-invitationGroup">Grupo de invitación</label>

          <input id="edit-invitationGroup" name="invitationGroup" value="${guest.invitationGroup || ""}"
            placeholder="Ej: Familia Rako, Sebastian, Mónica, Iyali y Amélie…" />
          <small style="color:#8a7a5f;display:block;margin-top:0.25rem;">
            Grupo visible en la invitación. El grupo interno (${guest.group || "—"}) se edita en la hoja de cálculo.
          </small>
        </div>

        <div class="dashboard-modal-field">
          <label for="edit-phone">Teléfono</label>
          <input id="edit-phone" name="phone" value="${guest.identity?.phone || guest.phone || ""}" placeholder="Ej: +52 1 55 1234 5678" />
        </div>

        <div class="dashboard-modal-field">
          <label for="edit-idCheckUser">Verificación de identidad</label>
          <select id="edit-idCheckUser" name="idCheckUser">
            <option value="true" ${guest.idCheckUser ? "selected" : ""}>Sí</option>
            <option value="false" ${!guest.idCheckUser ? "selected" : ""}>No</option>
          </select>
        </div>

        <div class="dashboard-modal-field">
          <label for="edit-messageAuthor">Autor del mensaje</label>

          <input id="edit-messageAuthor" name="messageAuthor" value="${guest.messageAuthor || ""}"
            placeholder="Ej: David y Aydé" />
        </div>

        <div class="dashboard-modal-actions">
          <button class="dashboard-button" type="submit">Guardar cambios</button>
          <button class="dashboard-button dashboard-button-secondary" type="button" data-modal-close>Cancelar</button>
        </div>
        <small data-guest-editor-status></small>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close handlers
  overlay.querySelectorAll("[data-modal-close]").forEach((btn) => {
    btn.addEventListener("click", () => overlay.remove());
  });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });

  // ── Avatar file upload ──
  // When the admin picks an image, upload it to Cloudinary (boda/avatars),
  // then fill the hidden public-id input and refresh the preview thumbnail.
  const avatarFileInput = overlay.querySelector("#edit-avatar-file");
  const avatarIdInput = overlay.querySelector("#edit-identityCloudinaryId");
  const avatarPreview = overlay.querySelector("[data-avatar-preview]");
  const avatarStatus = overlay.querySelector("[data-avatar-upload-status]");
  avatarFileInput.addEventListener("change", async () => {
    const file = avatarFileInput.files?.[0];
    if (!file) return;
    avatarStatus.textContent = "Subiendo…";
    avatarStatus.style.color = "#8a7a5f";
    try {
      const publicId = await uploadAvatarToCloudinary(file);
      avatarIdInput.value = publicId;
      avatarPreview.innerHTML = `<img src="https://res.cloudinary.com/k2ajcgxv/image/upload/q_auto,f_auto,c_fill,g_auto,w_256,h_256/${publicId}" alt="Nueva foto" />`;
      avatarStatus.textContent = `✅ Subida: ${publicId}`;
      avatarStatus.style.color = "#4caf50";
    } catch (err) {
      console.error("Avatar upload failed", err);
      avatarStatus.textContent = `❌ ${err.message || "Error al subir la foto"}`;
      avatarStatus.style.color = "#a0352c";
    }
  });

  // Submit handler — only writes AGREED SCHEMA fields to `guests`
  const form = overlay.querySelector("[data-guest-form]");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const status = overlay.querySelector("[data-guest-editor-status]");
    status.textContent = "Guardando…";
    status.dataset.state = "working";

    const guestId = data.get("id");
    const updated = buildDashboardGuestEditPayload({
      guestId,
      firstName: data.get("firstName"),
      middleName: data.get("middleName") || "",
      lastName: data.get("lastName") || "",
      maternalLastName: data.get("maternalLastName") || "",
      gender: data.get("gender") || "",
      age: data.get("age") || "",
      invitationGroup: data.get("invitationGroup") || "",

      phone: data.get("phone") || "",
      idCheckUser: data.get("idCheckUser") === "true",
      cloudinaryId: data.get("identityCloudinaryId") || data.get("cloudinaryId") || "",
      messageAuthor: data.get("messageAuthor") || "",
      timestamp: new Date(),
    });

    try {
      await updateGuest(guestId, updated);


      // Update in-memory guest

      const g = getGuest(guestId);
      if (g) {
        g.identity = {
          ...(g.identity || {}),
          ...(updated.identity || {}),
        };
        g.firstName = updated.identity?.firstName || g.firstName;
        g.middleName = updated.identity?.middleName || g.middleName;
        g.lastName = updated.identity?.lastName || g.lastName;
        g.maternalLastName = updated.identity?.maternalLastName || g.maternalLastName;
        g.gender = updated.identity?.gender || g.gender;
        g.identity.cloudinaryId = updated.identity?.cloudinaryId || g.identity.cloudinaryId;
        g.invitationGroup = updated.invitationGroup;
        g.phone = updated.identity?.phone || g.phone;
        g.idCheckUser = updated.idCheckUser;
        g.cloudinaryId = updated.identity?.cloudinaryId || updated.cloudinaryId;
        g.messageAuthor = updated.messageAuthor;
      }


      status.textContent = "✅ Guardado.";
      status.dataset.state = "success";
      setTimeout(() => overlay.remove(), 1500);
    } catch (err) {
      console.error("Failed to save guest", err);
      status.textContent = "❌ Error al guardar. Intenta de nuevo.";
      status.dataset.state = "error";
    }
  });
}
