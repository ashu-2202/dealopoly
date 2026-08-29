export type CardVisualTone =
  | "action"
  | "money"
  | "property"
  | "wild"
  | "rent"
  | "rule";

export interface CardStyleToken {
  tone: CardVisualTone;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}

export const CARD_VISUAL_TOKENS: Record<CardVisualTone, CardStyleToken> = {
  property: {
    tone: "property",
    backgroundColor: "#F4F1EA",
    borderColor: "#D5D0C5",
    textColor: "#111415",
  },
  wild: {
    tone: "wild",
    backgroundColor: "#F4F1EA",
    borderColor: "#D5D0C5",
    textColor: "#111415",
  },
  action: {
    tone: "action",
    backgroundColor: "#0055A4",
    borderColor: "#A8C8FF",
    textColor: "#FFFFFF",
  },
  rent: {
    tone: "rent",
    backgroundColor: "#27A644",
    borderColor: "#83FC8E",
    textColor: "#FFFFFF",
  },
  money: {
    tone: "money",
    backgroundColor: "#8CD3A8",
    borderColor: "#FFFFFF",
    textColor: "#FFFFFF",
  },
  rule: {
    tone: "rule",
    backgroundColor: "#323536",
    borderColor: "#8C919D",
    textColor: "#E1E3E4",
  },
};
