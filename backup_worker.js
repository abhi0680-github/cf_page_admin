// This is a placeholder file for worker.js Not currently used by the project
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      var filename = url.pathname.replace(/^.*[\\/]/, '')
      //filename = filename.replace(/\.js/, '')
      //var file = '/function/'+filename+'.js'
      //const context = { request, env };
      //import { onRequest } from file ;
      return new Response("Ok : Hello from Cloudflare Worker! You have called "+filename+"from file ");
    }
    // Otherwise, serve the static assets.
    // Without this, the Worker will error and no assets will be served.
    return env.ASSETS.fetch(request);
  },
};

