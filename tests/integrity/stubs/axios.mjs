// Records posts; the test sets globalThis.__axios.reply to control the server answer.
globalThis.__axios ??= { posts: [], reply: { status: 'Ok', firstID: 'new-1' } };
export default { post: async (url, body) => { globalThis.__axios.posts.push({ url, body }); return { data: globalThis.__axios.reply }; } };
