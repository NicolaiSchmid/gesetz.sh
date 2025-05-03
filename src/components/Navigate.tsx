import Link from "next/link";

interface NavigateProps {
  law?: string;
  paragraph?: string;
}

export default function Navigate({ law, paragraph }: NavigateProps) {
  if (!law || !paragraph) return null;

  return (
    <div className="mb-4 flex w-full justify-between">
      <Link href={`/${law}`}>
        <a className="text-sm text-gray-600 hover:text-gray-900">
          ← Back to {law}
        </a>
      </Link>
      <div className="text-sm text-gray-600">
        {law} §{paragraph}
      </div>
    </div>
  );
}
