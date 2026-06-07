document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const deleteConfirmationModal = document.getElementById("delete-confirmation-modal");
  const deleteConfirmationText = document.getElementById("delete-confirmation-text");
  const cancelUnregisterButton = document.getElementById("cancel-unregister-button");
  const confirmUnregisterButton = document.getElementById("confirm-unregister-button");
  let pendingUnregister = null;

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        const participantsList = details.participants.length
          ? details.participants
              .map(
                (participant) => `
                  <li>
                    <span class="participant-email">${participant}</span>
                    <button
                      type="button"
                      class="remove-participant-button"
                      data-activity="${encodeURIComponent(name)}"
                      data-email="${encodeURIComponent(participant)}"
                      aria-label="Unregister ${participant} from ${name}"
                      title="Unregister participant"
                    >
                      Un-Register
                    </button>
                  </li>
                `
              )
              .join("")
          : "<li class=\"participant-empty\">No students signed up yet</li>";

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <p class="participants-title">Participants (${details.participants.length})</p>
            <ul class="participants-list">
              ${participantsList}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      return activities;
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
      return null;
    }
  }

  function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function closeUnregisterModal() {
    deleteConfirmationModal.classList.add("hidden");
    pendingUnregister = null;
    confirmUnregisterButton.disabled = false;
    confirmUnregisterButton.textContent = "Understand";
  }

  function openUnregisterModal(activity, email) {
    pendingUnregister = { activity, email };
    deleteConfirmationText.textContent = `This action will remove ${email} from ${activity}. The registration cannot be undone.`;
    deleteConfirmationModal.classList.remove("hidden");
    confirmUnregisterButton.focus();
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }

      if (response.ok) {
        fetchActivities();
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  activitiesList.addEventListener("click", (event) => {
    const removeButton = event.target.closest(".remove-participant-button");
    if (!removeButton) {
      return;
    }

    const activity = decodeURIComponent(removeButton.dataset.activity || "");
    const email = decodeURIComponent(removeButton.dataset.email || "");

    if (!activity || !email) {
      showMessage("Unable to unregister participant. Missing activity or email.", "error");
      return;
    }

    openUnregisterModal(activity, email);
  });

  cancelUnregisterButton.addEventListener("click", () => {
    closeUnregisterModal();
  });

  deleteConfirmationModal.addEventListener("click", (event) => {
    if (event.target === deleteConfirmationModal) {
      closeUnregisterModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !deleteConfirmationModal.classList.contains("hidden")) {
      closeUnregisterModal();
    }
  });

  confirmUnregisterButton.addEventListener("click", async () => {
    if (!pendingUnregister) {
      return;
    }

    const { activity, email } = pendingUnregister;
    confirmUnregisterButton.disabled = true;
    confirmUnregisterButton.textContent = "Removing...";

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        const updatedActivities = await fetchActivities();
        const participantStillRegistered = updatedActivities?.[activity]?.participants?.includes(email);

        if (participantStillRegistered) {
          throw new Error("Deletion validation failed.");
        }

        showMessage(result.message, "success");
        closeUnregisterModal();
      } else {
        showMessage(result.detail || "Failed to unregister participant.", "error");
        closeUnregisterModal();
      }
    } catch (error) {
      showMessage("Failed to unregister participant. Please try again.", "error");
      console.error("Error unregistering participant:", error);
      closeUnregisterModal();
    }
  });

  // Initialize app
  fetchActivities();
});
