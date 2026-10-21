import { handle } from '../../cloudflare/api.mjs';
export const onRequest = ({ request, env }) => handle(request, env);
