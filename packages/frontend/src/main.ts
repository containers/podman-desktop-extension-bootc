import App from './App.svelte';

const target = document.getElementById('app');
let app;
if (target) {
  app = new App({
    target,
  });
}
export default app;
