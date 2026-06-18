import Image from "next/image";

export default function PortalHeader() {
  return (
    <header className="border-b-4 border-portal-primary">
      <Image
        src="/images/3625fae3-60f6-4d87-a8b3-bc91af20df7c.png"
        alt="Trường Cao Đẳng Kỹ Thuật Mật Mã - Lớp học trực tuyến"
        width={2172}
        height={320}
        priority
        className="h-auto w-full object-cover object-center"
      />
    </header>
  );
}
