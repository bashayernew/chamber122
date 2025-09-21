import { ensureSessionHydrated, onAnyAuthChange } from './auth-session.js';
import { go } from './nav.js';

async function guard(){
  const session = await ensureSessionHydrated();
  if (!session?.user) go('/auth.html');
}
guard();

onAnyAuthChange((_evt, session) => {
  if (!session?.user) go('/auth.html');
});
