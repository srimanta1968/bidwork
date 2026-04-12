interface SuccessMessageProps {
  message: string;
  show: boolean;
}

export default function SuccessMessage({ message, show }: SuccessMessageProps) {
  if (!show) return null;

  return (
    <div className="mb-4 p-3 bg-emerald-900/30 border border-emerald-700 rounded-lg text-emerald-400 text-sm">
      {message}
    </div>
  );
}
