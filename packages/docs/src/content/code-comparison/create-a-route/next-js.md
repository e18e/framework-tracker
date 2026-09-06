---
docs: https://nextjs.org/docs/app/getting-started/layouts-and-pages
---

```tsx title="app/about/page.tsx"
export default function AboutPage() {
  return <h1>About</h1>
}
```

```tsx title="app/posts/[id]/page.tsx"
interface Props {
  params: Promise<{ id: string }>
}

export default async function PostPage({ params }: Props) {
  const { id } = await params

  return <p>Post {id}</p>
}
```
