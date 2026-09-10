import { Link } from 'react-router-dom';
import { Button } from '../components/ui';

export function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <h1 className="font-display text-2xl text-ash-50">Page not found</h1>
      <p className="max-w-sm text-sm text-ash-400">
        That page doesn't exist. Head back to the status board or the home page.
      </p>
      <Link to="/">
        <Button variant="secondary">Back to Home</Button>
      </Link>
    </div>
  );
}
