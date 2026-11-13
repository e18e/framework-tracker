import './initial-load.css'
import type { Route } from './+types/initial-load'

export default function InitialLoad(_props: Route.ComponentProps) {
  return (
    <main className="performance-page">
      <div className="performance-content">
        <p className="performance-eyebrow">Ecosystem Performance</p>
        <h1>Small steps. Faster experiences.</h1>
        <p className="performance-intro">
          A healthier JavaScript ecosystem starts with the essentials. Explore
          three ways to make your projects lighter, faster, and easier to
          maintain.
        </p>
        <ul className="performance-cards">
          <li className="performance-card">
            <span className="performance-number" aria-hidden="true">
              01
            </span>
            <h2>Cleanup</h2>
            <p>
              Remove unnecessary dependencies and simplify your code to build a
              leaner foundation.
            </p>
            <a href="https://e18e.dev/learn/cleanup.html">
              Explore Cleanup -&gt;
            </a>
          </li>
          <li className="performance-card">
            <span className="performance-number" aria-hidden="true">
              02
            </span>
            <h2>Speedup</h2>
            <p>
              Find performance bottlenecks and make the tools you use every day
              run faster.
            </p>
            <a href="https://e18e.dev/learn/speedup.html">
              Explore Speedup -&gt;
            </a>
          </li>
          <li className="performance-card">
            <span className="performance-number" aria-hidden="true">
              03
            </span>
            <h2>Levelup</h2>
            <p>
              Improve your tooling and adopt better practices for a healthier
              ecosystem.
            </p>
            <a href="https://e18e.dev/learn/levelup.html">
              Explore Levelup -&gt;
            </a>
          </li>
        </ul>
      </div>
    </main>
  )
}
