import { IconBag } from "./icons";

export type AuthCoverProps = {
  slogan?: string;
};

export function AuthCover({
  slogan = "Frescura que se ve, calidad que se siente",
}: AuthCoverProps) {
  return (
    <div className="tem-cover">
      <div className="tem-cover__mark">
        <IconBag />
      </div>
      <h1 className="tem-cover__title">
        Tienda Express <span>Merk</span>
      </h1>
      <p className="tem-cover__slogan">{slogan}</p>
    </div>
  );
}
