// Contact form — client-side validation + Formspree submission
(function () {
  const form    = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');
  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const data = new FormData(form);
    const submit = form.querySelector('.form-submit');
    submit.disabled = true;
    submit.textContent = 'Sending…';

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: data,
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        form.style.display = 'none';
        success.style.display = 'block';
      } else {
        submit.disabled = false;
        submit.textContent = 'Submit';
        alert('There was a problem sending your message. Please email us directly at sales@chiselandgroovenc.com');
      }
    } catch (err) {
      submit.disabled = false;
      submit.textContent = 'Submit';
      alert('There was a problem sending your message. Please email us directly at sales@chiselandgroovenc.com');
    }
  });
})();
