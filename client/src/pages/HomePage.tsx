import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* Hero Section */}
      <header className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          BidWork
        </h1>
        <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-4">
          AI-powered home project scoping and contractor bidding marketplace.
        </p>
        <p className="text-lg text-slate-400 max-w-3xl mx-auto mb-10">
          Upload photos and videos of your project. Get an AI-generated scope of work with photo evidence, an editable task list, and a calculated bid range — all before any contractor is involved.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/register"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
          >
            Get Started
          </Link>
          <Link
            to="/login"
            className="px-8 py-3 border border-slate-500 hover:border-slate-400 rounded-lg font-semibold transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700">
            <div className="text-4xl mb-4">1</div>
            <h3 className="text-xl font-semibold mb-3 text-blue-400">Upload Your Project</h3>
            <p className="text-slate-400">
              Share photos and videos of your home project. Our AI analyzes every detail to understand the full scope of work.
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700">
            <div className="text-4xl mb-4">2</div>
            <h3 className="text-xl font-semibold mb-3 text-emerald-400">Review AI Scope</h3>
            <p className="text-slate-400">
              Get a detailed task list with photo evidence, edit as needed, and see a calculated bid range from floor to ceiling.
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-8 border border-slate-700">
            <div className="text-4xl mb-4">3</div>
            <h3 className="text-xl font-semibold mb-3 text-amber-400">Receive Contractor Bids</h3>
            <p className="text-slate-400">
              Contractors bid within the defined range, competing on quality and speed. Pick the best fit and get the job done.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="container mx-auto px-6 py-16">
        <div className="bg-gradient-to-r from-blue-600/20 to-emerald-600/20 border border-blue-500/30 rounded-2xl p-12 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Ready to scope your next project?</h2>
          <p className="text-slate-300 mb-8">
            AI understands the job first. Humans refine. Pricing is bounded. Contractors bid informed.
          </p>
          <Link
            to="/register"
            className="inline-block px-10 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-lg transition-colors"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-10 border-t border-slate-700 text-center text-slate-500">
        <p>&copy; {new Date().getFullYear()} BidWork. The operating system for home services execution.</p>
      </footer>
    </div>
  );
}
