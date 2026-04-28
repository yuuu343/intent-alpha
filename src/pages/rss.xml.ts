import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const articles = (await getCollection('articles', ({ data }) => !data.draft))
    .sort((a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime());

  return rss({
    title: 'Intent Alpha',
    description: 'What companies are building next, inferred from public hiring signals.',
    site: context.site!,
    items: articles.map((article) => ({
      title: article.data.title,
      pubDate: article.data.publishedAt,
      description: article.data.description,
      link: `/articles/${article.id}/`,
    })),
  });
}
