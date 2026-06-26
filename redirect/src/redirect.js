/**
 * 301 redirect Worker for the retired subdomain.
 *
 * The site moved from cc-themes-for-ghostty.facundogoni.com.ar (a custom_domain
 * static-assets Worker) to the sub-path www.facundogoni.com.ar/ghostty-themes.
 * A handful of inbound links still point at the old subdomain, so this tiny
 * Worker — bound to that hostname — permanently redirects every request to the
 * matching path under the new base, preserving sub-paths and query strings:
 *   /              -> /ghostty-themes/
 *   /og-image.png  -> /ghostty-themes/og-image.png
 *   /sitemap.xml   -> /ghostty-themes/sitemap.xml
 */
export default {
  fetch(request) {
    const url = new URL(request.url);
    const target = new URL('https://www.facundogoni.com.ar');
    target.pathname = '/ghostty-themes' + url.pathname;
    target.search = url.search;
    return Response.redirect(target.toString(), 301);
  },
};
