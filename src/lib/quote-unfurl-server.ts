/**
 * Local unfurl. The edge function owns the renderer and does not import this
 * file. Dev uses the same card, fonts, and Open Graph markup.
 */
export {
  cardFill,
  decodeQuoteToken,
  pagesOpenUrl,
  renderQuoteHtml,
  renderQuotePng,
  shareCardFunctionUrl,
} from "../../supabase/functions/share-card/card.ts";
