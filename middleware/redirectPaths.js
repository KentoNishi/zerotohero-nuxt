export default function ({ route, redirect }) {
  const path = route.path;

  // Supabase Auth email links land on /#access_token=... (fragment). If a
  // stale client bundle mangles that into a path (/access_token=...), catch it
  // server-side here so SSR never renders _slug.vue and 500s on the giant
  // token string.
  const supabasePath = path.match(/^\/(access_token|error|error_code|error_description)=/);
  if (supabasePath) {
    return redirect('/login?verified=' + (supabasePath[1] === 'access_token' ? '1' : '0'));
  }

  if (path.includes('/youtube/view/')) {
    const newPath = path.replace('/youtube/view/', '/video-view/youtube/');
    return redirect(newPath);
  }

  if (path.includes('/zh/en/online-courses')) {
    return redirect('https://m.cctalk.com/inst/stevmab3');
  }

  if (path.includes('/en/zh/online-courses')) {
    return redirect('https://chinesezerotohero.teachable.com/');
  }
}
