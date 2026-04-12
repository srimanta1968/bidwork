interface ErrorMessageProps {
  message: string | null;
  show: boolean;
}

export default function ErrorMessage({ message, show }: ErrorMessageProps) {
  if (!show || !message) return null;

  return (
    <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
      {message}
    </div>
  );
}
