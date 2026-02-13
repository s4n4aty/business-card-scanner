/**
 * 名刺パーサー - OCR結果から主要項目を抽出
 * 正規表現ベースのシンプルなパーサー
 */

/**
 * OCRテキストから名刺情報を抽出
 * @param {string} text - OCRで取得したテキスト
 * @returns {object} 抽出した名刺情報
 */
function parseBusinessCard(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const fullText = text.replace(/\n/g, ' ');
  
  return {
    name: extractName(lines, fullText),
    company: extractCompany(lines, fullText),
    department: extractDepartment(lines, fullText),
    title: extractTitle(lines, fullText),
    tel: extractTel(fullText),
    mobile: extractMobile(fullText),
    email: extractEmail(fullText),
    address: extractAddress(fullText)
  };
}

/**
 * 氏名を抽出
 */
function extractName(lines, fullText) {
  // 候補1: 「氏名」「名前」などのラベル後
  const labelMatch = fullText.match(/(?:氏名|名前|Name)[:：\s]*([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]{2,5})/i);
  if (labelMatch) return labelMatch[1].trim();
  
  // 候補2: 2-4文字の漢字・ひらがな・カタカナ（行の先頭または独立した行）
  for (const line of lines) {
    // 会社名っぽいのは除外
    if (/株式会社|有限公司|社長|部長|課長/.test(line)) continue;
    
    // 漢字・ひらがな・カタカナのみ、2-5文字
    const nameMatch = line.match(/^([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF・\s]{2,6})$/);
    if (nameMatch) return nameMatch[1].trim();
    
    // 苗名 名前 形式
    const fullNameMatch = line.match(/^([\u4E00-\u9FAF]{1,4}\s*[\u4E00-\u9FAF]{1,4})$/);
    if (fullNameMatch && fullNameMatch[1].length <= 6) return fullNameMatch[1].trim();
  }
  
  return '';
}

/**
 * 会社名を抽出
 */
function extractCompany(lines, fullText) {
  // 「株式会社」「有限公司」などを含む行
  for (const line of lines) {
    const match = line.match(/(.*?(?:株式会社|有限公司|合同会社|合名会社|合資会社|[^\s]{2,20}(?:社|会社|Corp|Inc|Ltd|LLP))\.?)/i);
    if (match) return match[1].trim();
  }
  
  return '';
}

/**
 * 部署を抽出
 */
function extractDepartment(lines, fullText) {
  // 部署名パターン
  const deptPatterns = [
    /(?:部署|所属|Dept)[:：\s]*([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]{2,15}部?)/i,
    /([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]{2,10}(?:部|課|室|チーム|グループ))/,
    /([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]{2,8}(?:事業|営業|開発|管理|総務|人事|経理|法務|広報|企画))/,
  ];
  
  for (const pattern of deptPatterns) {
    const match = fullText.match(pattern);
    if (match) return match[1].trim();
  }
  
  return '';
}

/**
 * 役職を抽出
 */
function extractTitle(lines, fullText) {
  const titlePatterns = [
    /(?:役職|職位|Title)[:：\s]*([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]{2,10})/i,
    /(代表取締役|取締役|執行役員|部長|課長|係長|主任|マネージャー|リーダー|担当)/,
    /(社長|会長|専務|常務|本部長|室長|チーフ)/
  ];
  
  for (const pattern of titlePatterns) {
    const match = fullText.match(pattern);
    if (match) return match[1].trim();
  }
  
  return '';
}

/**
 * 電話番号を抽出
 */
function extractTel(text) {
  // TEL/TEL.の後の番号
  const patterns = [
    /(?:TEL|電話|Tel)[:：\.\s]*[\D]*([\d\-–—\(\)\s]{10,15}\d)/i,
    /\b(0\d{1,4}[\-–—\s]\d{1,4}[\-–—\s]\d{4})\b/,
    /\(\d{2,4}\)\s*\d{1,4}[\-–—\s]\d{4}/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return normalizePhone(match[1] || match[0]);
  }
  
  return '';
}

/**
 * 携帯電話番号を抽出
 */
function extractMobile(text) {
  const patterns = [
    /(?:携帯|モバイル|Cell|Mobile)[:：\.\s]*[\D]*([\d\-–—\(\)\s]{10,15}\d)/i,
    /\b(0[7-9]0[\-–—\s]\d{4}[\-–—\s]\d{4})\b/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return normalizePhone(match[1] || match[0]);
  }
  
  return '';
}

/**
 * メールアドレスを抽出
 */
function extractEmail(text) {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : '';
}

/**
 * 住所を抽出
 */
function extractAddress(text) {
  const patterns = [
    /(?:住所|所在地|Address)[:：\s]*(.{10,60}?)(?:\d{5,}|TEL|電話|$)/i,
    /((?:〒\s*)?\d{3}[-\s]?\d{4}.{10,50})/,
    /([\u4E00-\u9FAF]{2,5}(?:都|道|府|県)[\u4E00-\u9FAF]{1,20}(?:市|区|町|村)[^\n]{10,40})/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim().substring(0, 100);
  }
  
  return '';
}

/**
 * 電話番号を正規化
 */
function normalizePhone(phone) {
  return phone
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, '')
    .replace(/[\(\)]/g, '')
    .trim();
}

/**
 * テスト用: パーサーの動作確認
 */
function testParser() {
  const sampleText = `株式会社サンプル
営業部
山田 太郎

TEL: 03-1234-5678
携帯: 090-1234-5678
Email: yamada@example.co.jp

〒100-0001
東京都千代田区千代田1-1-1`;
  
  const result = parseBusinessCard(sampleText);
  console.log(JSON.stringify(result, null, 2));
}
