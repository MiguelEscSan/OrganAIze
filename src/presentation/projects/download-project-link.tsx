type DownloadProjectLinkProps = {
  href: string;
};

export const DownloadProjectLink = ({ href }: DownloadProjectLinkProps) => (
  <a href={href} download className="inline-flex min-h-11 items-center self-start rounded-lg bg-black/80 px-3 text-sm text-white md:self-auto">
    Download
  </a>
);
