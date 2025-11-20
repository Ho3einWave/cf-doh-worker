/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request, env, ctx): Promise<Response> {
		return handleRequest(request, env);
	},
} satisfies ExportedHandler<Env>;

async function handleRequest(request: Request, env: Env): Promise<Response> {
	const doh = env.doh;
	const dohJson = env.dohjson;
	const contype = env.contype;
	const jsonType = env.jsontype;
	const path = env.path;

	const r404 = new Response(null, { status: 404 });

	// when res is a Promise<Response>, it reduces billed wall-time
	// blog.cloudflare.com/workers-optimization-reduces-your-bill
	let res: Promise<Response> | Response = r404;
	const { method, headers, url } = request;
	const { searchParams, pathname } = new URL(url);

	// Check path
	// If path is set in env, restrict access to that path
	if (path && !pathname.startsWith(path)) {
		return r404;
	}

	if (method == 'GET' && searchParams.has('dns')) {
		res = fetch(doh + '?dns=' + searchParams.get('dns'), {
			method: 'GET',
			headers: {
				Accept: contype,
			},
		});
	} else if (method === 'POST' && headers.get('content-type') === contype) {
		// streaming out the request body is optimal than awaiting on it
		const rostream = request.body;
		res = fetch(doh, {
			method: 'POST',
			headers: {
				Accept: contype,
				'Content-Type': contype,
			},
			body: rostream,
		});
	} else if (method === 'GET' && headers.get('Accept') === jsonType) {
		const search = new URL(url).search;
		res = fetch(dohJson + search, {
			method: 'GET',
			headers: {
				Accept: jsonType,
			},
		});
	}
	return res;
}
