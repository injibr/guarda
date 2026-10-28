const CLUSTER_HOST = process.env.EXPO_PUBLIC_CLUSTER_HOST || '10.0.2.2';

const URL_MAP = {
  'inji-certify.inji-local.svc.cluster.local': `${CLUSTER_HOST}:30090`,
  'wiremock-inji-eca.inji-local.svc.cluster.local:8080': `${CLUSTER_HOST}:30093`,
  'wiremock-inji.inji-local.svc.cluster.local': `${CLUSTER_HOST}:30093`,
  'inji-verify-service.inji-local.svc.cluster.local': `${CLUSTER_HOST}:30091`,
};

const patchUrl = (url) => {
  if (typeof url !== 'string') return url;
  let patched = url;
  for (const [cluster, local] of Object.entries(URL_MAP)) {
    patched = patched.replace(cluster, local);
  }
  return patched;
};

const originalFetch = global.fetch;
global.fetch = (url, options) => originalFetch(patchUrl(url), options);
