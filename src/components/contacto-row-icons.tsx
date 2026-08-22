import { IconWhatsApp, IconMail, IconInstagram, IconGlobe } from "@/components/icons";
import { whatsappLink, mailtoLink, instagramLink, webLink } from "@/lib/contact-links";
import { useFirma } from "@/lib/firma-context";

export default function ContactoRowIcons({
  telefono,
  email,
  instagram,
  web,
}: {
  telefono: string | null;
  email: string | null;
  instagram: string | null;
  web: string | null;
}) {
  const firma = useFirma();
  const wa = whatsappLink(telefono);
  const mail = mailtoLink(email, firma);
  const ig = instagramLink(instagram);
  const site = webLink(web);

  const inactivo = "text-gray-300";

  return (
    <span className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir WhatsApp"
          className="text-[#25D366] hover:opacity-70"
        >
          <IconWhatsApp width={17} height={17} />
        </a>
      ) : (
        <span title="Sin WhatsApp" className={inactivo}>
          <IconWhatsApp width={17} height={17} />
        </span>
      )}
      {mail ? (
        <button
          type="button"
          onClick={() =>
            window.open(
              mail,
              "tasaprop-compose",
              "width=680,height=640,resizable=yes,scrollbars=yes,noopener,noreferrer"
            )
          }
          title="Enviar email"
          className="text-[#17184B] hover:opacity-70"
        >
          <IconMail width={17} height={17} />
        </button>
      ) : (
        <span title="Sin email" className={inactivo}>
          <IconMail width={17} height={17} />
        </span>
      )}
      {ig ? (
        <a
          href={ig}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir Instagram"
          className="text-[#72767B] hover:text-[#17184B]"
        >
          <IconInstagram width={17} height={17} />
        </a>
      ) : (
        <span title="Sin Instagram" className={inactivo}>
          <IconInstagram width={17} height={17} />
        </span>
      )}
      {site ? (
        <a
          href={site}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir sitio web"
          className="text-[#72767B] hover:text-[#17184B]"
        >
          <IconGlobe width={17} height={17} />
        </a>
      ) : (
        <span title="Sin sitio web" className={inactivo}>
          <IconGlobe width={17} height={17} />
        </span>
      )}
    </span>
  );
}
