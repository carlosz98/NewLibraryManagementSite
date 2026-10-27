import { coverLook, cn } from "../lib/utils.js";

/* Generated, edition-style cover for any item:
 *   book  -> hardcover with a dust jacket
 *   manga -> numbered paperback volume, spine on the right
 *   comic -> single issue with masthead, issue number, price box
 *   vinyl -> square LP sleeve with the record peeking out
 *   movie -> VHS box
 * Colors, angles and numbers come from the title, so each item always looks the same. */
export function Cover({ item, className, showLoan = true, tall = false }) {
  const { h, style } = coverLook(item);
  const surname = (item.creator.trim().split(/\s+/).pop() || "").toUpperCase();
  const out = showLoan && !item.isAvailable;

  let inner;
  switch (item.type) {
    case "book":
      inner = (
        <div className="ed ed--book">
          <span className="ed__a">{item.creator}</span>
          <span className="ed__rule" />
          <span className="ed__t">{item.title}</span>
          <span className="ed__mark">LT</span>
        </div>
      );
      break;
    case "manga":
      inner = (
        <div className="ed ed--manga">
          <span className="ed__vol">{1 + (h % 12)}</span>
          <span className="ed__t">{item.title}</span>
          <span className="ed__a">{surname}</span>
        </div>
      );
      break;
    case "comic":
      inner = (
        <div className="ed ed--comic">
          <span className="ed__mast">{item.title}</span>
          <span className="ed__issue">No. {1 + (h % 99)}</span>
          <span className="ed__price">35¢</span>
          <span className="ed__panel" />
          <span className="ed__a">{item.creator}</span>
        </div>
      );
      break;
    case "vinyl":
      inner = (
        <div className="ed ed--lp">
          <span className="ed__disc" />
          <span className="ed__sleeve">
            <span className="ed__t">{item.title}</span>
            <span className="ed__a">{item.creator}</span>
            <span className="ed__sticker">33⅓</span>
          </span>
        </div>
      );
      break;
    default:
      inner = (
        <div className="vhs">
          <div className="vhs__face">
            <span className="vhs__badge">VHS</span>
            <span className="vhs__art" />
            <span className="vhs__t">{item.title}</span>
            <span className="vhs__d">a film by {item.creator}</span>
            <span className="vhs__foot">
              <b className="font-medium">{80 + (h % 70)} min</b>
              <b className="font-medium">Color</b>
            </span>
          </div>
        </div>
      );
  }

  return (
    <div className={cn("cover", tall && "cover--tall", out && "is-out", className)} style={style} aria-hidden>
      {inner}
    </div>
  );
}
