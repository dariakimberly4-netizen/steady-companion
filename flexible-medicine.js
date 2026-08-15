(() => {
  const ANYTIME_VALUE = '00:00';

  function setAnytimeForm() {
    const timeInput = document.getElementById('medTime');
    if (!timeInput) return;

    const field = timeInput.closest('.field');
    if (field && !field.dataset.anytime) {
      field.dataset.anytime = 'true';
      field.innerHTML = `
        <label>When</label>
        <div class="charging" style="padding:14px 16px">
          <strong>No specific time</strong>
          <div class="small muted" style="margin-top:4px">Tap “Mark as taken” whenever you take it. The actual date and time are recorded automatically.</div>
        </div>
        <input id="medTime" type="hidden" value="${ANYTIME_VALUE}" />`;
    }

    const form = document.getElementById('medForm');
    if (form && !form.dataset.anytimeHandler) {
      form.dataset.anytimeHandler = 'true';
      form.onsubmit = e => {
        e.preventDefault();
        data.medicines.push({
          id: crypto.randomUUID(),
          name: document.getElementById('medName').value.trim(),
          dose: document.getElementById('medDose').value.trim(),
          time: ANYTIME_VALUE,
          scheduleType: 'anytime'
        });
        e.target.reset();
        const hiddenTime = document.getElementById('medTime');
        if (hiddenTime) hiddenTime.value = ANYTIME_VALUE;
        closeModals();
        save();
        toast('Medicine saved — no specific time');
      };
    }
  }

  function setupCaregiverEmailInvite() {
    const form = document.getElementById('caregiverForm');
    if (!form || form.dataset.emailInviteHandler) return;
    form.dataset.emailInviteHandler = 'true';

    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.textContent = 'Send email invitation';

    const helper = form.querySelector('p.small.muted');
    if (helper) helper.textContent = 'We will email your caregiver a secure invitation to Steady Companion.';

    form.onsubmit = async e => {
      e.preventDefault();
      const email = document.getElementById('cgEmail').value.trim().toLowerCase();
      if (!email) return;

      const button = form.querySelector('button[type="submit"]');
      const oldText = button?.textContent || 'Send email invitation';
      if (button) {
        button.disabled = true;
        button.textContent = 'Sending…';
      }

      try {
        const { data: result, error } = await cloud.functions.invoke('invite-caregiver', {
          body: { email }
        });
        if (error) throw error;
        form.reset();
        await renderCareCircle();
        toast(result?.message || `Invitation email sent to ${email}`);
        closeModals();
      } catch (err) {
        console.error('Caregiver invitation email failed', err);
        toast(err?.message || 'Could not send invitation email. Please try again.');
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = oldText;
        }
      }
    };
  }

  function applyAnytimeLabels() {
    const nextTime = document.getElementById('nextTime');
    if (nextTime && data?.medicines?.length && nextTime.textContent !== 'No specific time') {
      nextTime.textContent = 'No specific time';
    }

    const nextCard = nextTime?.closest('.card');
    const eyebrow = nextCard?.querySelector('.eyebrow');
    if (eyebrow && eyebrow.textContent !== 'Medicine') eyebrow.textContent = 'Medicine';

    const medHero = document.querySelector('#medicines .hero p');
    if (medHero && medHero.textContent !== 'Manage medicines and record outcomes.') {
      medHero.textContent = 'Manage medicines and record outcomes.';
    }

    const snooze = document.getElementById('snooze');
    const skip = document.getElementById('skipDose');
    if (snooze) snooze.style.display = 'none';
    if (skip) skip.style.display = 'none';

    document.querySelectorAll('#medicineList .row .muted.small').forEach(el => {
      if (el.textContent.includes(' · 00:00')) {
        el.textContent = el.textContent.replace(' · 00:00', ' · No specific time');
      }
    });
  }

  function migrateUntimedMedicines() {
    if (!Array.isArray(data?.medicines) || !data.medicines.length) return;
    let changed = false;
    data.medicines.forEach(m => {
      if (!m.scheduleType) {
        m.time = ANYTIME_VALUE;
        m.scheduleType = 'anytime';
        changed = true;
      }
    });
    if (changed) save();
  }

  setAnytimeForm();
  setupCaregiverEmailInvite();
  migrateUntimedMedicines();
  applyAnytimeLabels();

  const observer = new MutationObserver(() => {
    setAnytimeForm();
    setupCaregiverEmailInvite();
    applyAnytimeLabels();
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
})();
