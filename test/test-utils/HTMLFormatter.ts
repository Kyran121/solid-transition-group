enum HTMLTokenType {
  OpenTag,
  CloseTag,
  SelfClosingTag,
  Text
}
type HTMLToken = {
  content: string;
  type: HTMLTokenType;
};
type TokenRule = {
  match: (content: string) => boolean;
  type: HTMLTokenType;
};

const INDENTATION = "  ";

function tokenizeHTML(html: string): HTMLToken[] {
  const regex = /<\/?[^>]+>|[^<>]+/g;
  let match: RegExpExecArray | null;
  const tokens: HTMLToken[] = [];

  while ((match = regex.exec(html)) !== null) {
    const tokenContent = match[0].trim();
    tokens.push(createToken(tokenContent));
  }

  return tokens;
}

const tokenRules: TokenRule[] = [
  { match: content => content.startsWith("</"), type: HTMLTokenType.CloseTag },
  { match: content => content.endsWith("/>"), type: HTMLTokenType.SelfClosingTag },
  { match: content => content.startsWith("<"), type: HTMLTokenType.OpenTag },
  { match: () => true, type: HTMLTokenType.Text }
];

function createToken(content: string): HTMLToken {
  const type = tokenRules.find(rule => rule.match(content))!.type;
  return { content, type };
}

const formatStrategies: { [key in HTMLTokenType]: (token: HTMLToken, depth: number) => string } = {
  [HTMLTokenType.OpenTag]: formatOpenTag,
  [HTMLTokenType.CloseTag]: formatSimpleTag,
  [HTMLTokenType.SelfClosingTag]: formatSimpleTag,
  [HTMLTokenType.Text]: formatSimpleTag
};

function formatToken(token: HTMLToken, depth: number): string {
  return formatStrategies[token.type](token, depth);
}

function formatOpenTag(token: HTMLToken, depth: number): string {
  const tagName = token.content.match(/^<\w+/)![0];
  const attributes = token.content.substring(tagName.length, token.content.length - 1).trim();
  const formattedAttributes =
    attributes && `\n${formatAttributes(attributes, depth + 1)}\n${INDENTATION.repeat(depth)}`;
  return `${INDENTATION.repeat(depth)}${tagName}${formattedAttributes}>\n`;
}

function formatSimpleTag(token: HTMLToken, depth: number): string {
  return `${INDENTATION.repeat(depth)}${token.content}\n`;
}

function formatAttributes(attributes: string, depth: number): string {
  const attributeTokens = tokenizeAttributes(attributes);
  const indentation = INDENTATION.repeat(depth);
  return attributeTokens.map(attr => `${indentation}${attr}`).join("\n");
}

function tokenizeAttributes(attributes: string): string[] {
  const regex = /([\w-]+)(?:=["']?([^"']*)["'])?/g;
  let match: RegExpExecArray | null;
  const tokens: string[] = [];

  while ((match = regex.exec(attributes)) !== null) {
    const attrName = match[1];
    const attrValue = match[2] ? `="${match[2]}"` : "";
    tokens.push(`${attrName}${attrValue}`);
  }

  return tokens;
}

export function formatHTML(html: string): string {
  const tokens = tokenizeHTML(html);
  let formattedHtml = "";
  let depth = 0;

  tokens.forEach(token => {
    if (token.type === HTMLTokenType.CloseTag) {
      depth--;
    }

    formattedHtml += formatToken(token, depth);

    if (token.type === HTMLTokenType.OpenTag) {
      depth++;
    }
  });

  return formattedHtml.trim();
}
