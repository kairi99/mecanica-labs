// The help pages follow the app's saved theme (the app stores it in localStorage); they need no other script.
try {
  const th = localStorage.getItem('mecanica:theme') ?? localStorage.getItem('digicart-mruv-theme')
  if (th === 'light' || th === 'dark') document.documentElement.dataset.theme = th
} catch { /* storage blocked: system theme */ }
