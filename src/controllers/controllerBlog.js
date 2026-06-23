const Post = require("../db/postDB");
const SiteConfig = require("../db/siteConfigDB");
const slugify = require("slugify");
const { resolveImage } = require("../utils/uploader");

// Texto curto a partir do markdown (para os cards da listagem)
function excerptOf(md, n = 160) {
  const t = String(md || "").replace(/[#*_`>\[\]()!~]/g, "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

// Gera um slug único a partir do título
async function uniqueSlug(title, excludeId) {
  const base = slugify(title, { lower: true, strict: true }) || "post";
  let slug = base, i = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await Post.findOne({ slug, _id: { $ne: excludeId } })) {
    slug = `${base}-${++i}`;
  }
  return slug;
}

const warn = (res, info, url, status = 500) =>
  res.status(status).render("warning", { title: "Aviso!", info, textButton: "Voltar", url, icon: "error" });

module.exports = {
  // ---------------- PÚBLICO ----------------

  // GET /blog
  publicList: async (req, res) => {
    try {
      const posts = await Post.find({ published: true }).sort({ createdAt: -1 }).lean();
      posts.forEach(p => { p.excerpt = excerptOf(p.body); });
      const site = await SiteConfig.getSingleton();
      res.render("blog", { posts, site });
    } catch (e) { warn(res, e.message, "/"); }
  },

  // GET /blog/:slug
  publicPost: async (req, res) => {
    try {
      const post = await Post.findOne({ slug: req.params.slug, published: true }).lean();
      if (!post) return warn(res, "Artigo não encontrado.", "/blog", 404);
      const site = await SiteConfig.getSingleton();
      res.render("blogPost", { post, site });
    } catch (e) { warn(res, e.message, "/blog"); }
  },

  // ---------------- ADMIN ----------------

  // GET /admin/dashboard/blog
  adminList: async (req, res) => {
    try {
      const posts = await Post.find().sort({ createdAt: -1 }).lean();
      res.render("adminBlogList", { posts });
    } catch (e) { warn(res, e.message, "/admin/dashboard"); }
  },

  // GET /admin/dashboard/blog/new
  newForm: (req, res) => {
    res.render("blogForm", { post: null });
  },

  // POST /admin/dashboard/blog
  create: async (req, res) => {
    try {
      const { title, body, coverUrl, published } = req.body;
      if (!title || !body) {
        return warn(res, "Título e conteúdo são obrigatórios.", "/admin/dashboard/blog/new", 400);
      }
      const coverImage = await resolveImage(req, coverUrl, "coddex/blog");
      await Post.create({
        title: title.trim(),
        slug: await uniqueSlug(title),
        coverImage,
        body,
        published: published === "on" || published === "true"
      });
      res.redirect("/admin/dashboard/blog");
    } catch (e) { warn(res, e.message, "/admin/dashboard/blog/new"); }
  },

  // GET /admin/dashboard/blog/:id/edit
  editForm: async (req, res) => {
    try {
      const post = await Post.findById(req.params.id).lean();
      if (!post) return warn(res, "Artigo não encontrado.", "/admin/dashboard/blog", 404);
      res.render("blogForm", { post });
    } catch (e) { warn(res, e.message, "/admin/dashboard/blog"); }
  },

  // POST /admin/dashboard/blog/:id/update
  update: async (req, res) => {
    try {
      const { title, body, coverUrl, published } = req.body;
      const post = await Post.findById(req.params.id);
      if (!post) return warn(res, "Artigo não encontrado.", "/admin/dashboard/blog", 404);
      if (!title || !body) {
        return warn(res, "Título e conteúdo são obrigatórios.", `/admin/dashboard/blog/${post._id}/edit`, 400);
      }
      if (title.trim() !== post.title) post.slug = await uniqueSlug(title, post._id);
      post.title = title.trim();
      post.body = body;
      post.coverImage = await resolveImage(req, coverUrl || post.coverImage, "coddex/blog");
      post.published = published === "on" || published === "true";
      await post.save();
      res.redirect("/admin/dashboard/blog");
    } catch (e) { warn(res, e.message, "/admin/dashboard/blog"); }
  },

  // POST /admin/dashboard/blog/:id/delete
  remove: async (req, res) => {
    try {
      await Post.findByIdAndDelete(req.params.id);
      res.redirect("/admin/dashboard/blog");
    } catch (e) { warn(res, e.message, "/admin/dashboard/blog"); }
  }
};
