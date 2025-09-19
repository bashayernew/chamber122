import { ensureSessionHydrated, onAnyAuthChange } from './auth-session.js';

async function guard(){
  const session = await ensureSessionHydrated();
  if (!session?.user) location.href = '/auth.html';
}
guard();

onAnyAuthChange((_evt, session) => {
  if (!session?.user) location.href = '/auth.html';
});
