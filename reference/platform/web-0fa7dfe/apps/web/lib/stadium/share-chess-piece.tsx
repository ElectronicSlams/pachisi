import palette from "./share-image-tokens.generated.json";

const shape:Record<string,string>={
    p:"M8 19L9 12A4 4 0 1 1 15 12L16 19ZM7 20H17V22H7Z",
    r:"M6 3H9V6H11V3H13V6H15V3H18V9L16 11V19H8V11L6 9ZM7 20H17V22H7Z",
    n:"M7 19L8 13L4 12L7 6L12 3L17 7L18 19ZM7 20H19V22H7Z",
    b:"M8 19L10 13C5 9 9 5 12 2C15 5 19 9 14 13L16 19ZM7 20H17V22H7Z",
    q:"M5 5L8 10L12 3L16 10L19 5L17 19H7ZM6 20H18V22H6Z",
    k:"M11 1H13V4H16V6H13V9H11V6H8V4H11ZM8 10H16L17 14L15 19H9L7 14ZM7 20H17V22H7Z"
  };

/** Local geometric pieces avoid remote glyph/font lookups and unsupported SVG text. */
export function ShareChessPiece({token,size}:{token:string;size:number}) {
  const white=token===token.toUpperCase();
  return <svg width={size} height={size} viewBox="0 0 24 24"><path d={shape[token.toLowerCase()] ?? ""} fill={white?palette["stone-white"]:palette["stone-black"]} stroke={white?palette["stone-black"]:palette["stone-white"]} strokeWidth="1" strokeLinejoin="round"/>{token.toLowerCase()==="n" ? <circle cx="11" cy="7" r="1" fill={white?palette["stone-black"]:palette["stone-white"]}/> : null}</svg>;
}
