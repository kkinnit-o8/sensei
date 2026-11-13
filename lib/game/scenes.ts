/**
 * City Adventures: scenes, characters and missions. Pure data, safe for client and server.
 * The `facts` of a mission are given to the AI so prices, menus and answers stay consistent.
 */

export type Expression = "neutral" | "happy" | "surprised" | "confused" | "thinking" | "annoyed";
export const EXPRESSIONS: Expression[] = ["neutral", "happy", "surprised", "confused", "thinking", "annoyed"];

export type HairStyle = "bob" | "twintails" | "messy" | "curly" | "spiky" | "neat" | "bun";
export type OutfitStyle = "apron" | "hoodie" | "polo" | "redApron" | "waiter" | "uniform" | "cardigan";
export type Accessory = "glasses" | "storeCap" | "officerCap" | "hairClip" | "earrings" | "stubble" | "wrinkles" | "bowTie" | "flowerPin" | "freckles" | "sweat";

export interface CharacterLook {
  skin: string;
  hair: { style: HairStyle; color: string; shade: string };
  eyes: { color: string; shape: "round" | "sleepy" | "sharp" | "gentle" };
  outfit: { style: OutfitStyle; main: string; accent: string; shirt: string };
  accessories: Accessory[];
}

export interface GameCharacter {
  id: string;
  name: string; // pinyin name for display
  hanzi: string;
  role: string;
  /** For the AI: who they are and how they behave. */
  personality: string;
  /** For the AI: how they talk. */
  speech: string;
  voice: { pitch: number; rate: number };
  look: CharacterLook;
}

export interface MissionGoal {
  id: string;
  text: string;
}

export interface Mission {
  id: string;
  title: string;
  brief: string;
  goals: MissionGoal[];
  /** Characters present in this mission (ids), first one speaks first. */
  cast: string[];
  /** Facts the characters know (menu, prices, answers). */
  facts: string;
  /** Useful words for this mission (shown on the briefing card). */
  words: string[];
}

export interface Scene {
  id: string;
  name: string;
  hanzi: string;
  pinyin: string;
  emoji: string;
  description: string;
  /** For the AI: the setting. */
  setting: string;
  missions: Mission[];
}

export const CHARACTERS: Record<string, GameCharacter> = {
  xiaolin: {
    id: "xiaolin",
    name: "Xiǎo Lín",
    hanzi: "小林",
    role: "barista",
    personality: "A cheerful young barista who loves coffee and chatting with regulars. Patient with beginners, a bit playful.",
    speech: "Friendly and upbeat, uses 呀 and 哦, short sentences, often recommends the iced latte.",
    voice: { pitch: 1.25, rate: 1 },
    look: {
      skin: "#f7d9c4",
      hair: { style: "bob", color: "#5b3a29", shade: "#3e271b" },
      eyes: { color: "#6b4a2b", shape: "round" },
      outfit: { style: "apron", main: "#2f7a5f", accent: "#f2e6c9", shirt: "#ffffff" },
      accessories: ["hairClip"],
    },
  },
  meimei: {
    id: "meimei",
    name: "Měiměi",
    hanzi: "美美",
    role: "your friend",
    personality: "Your bubbly friend who can never decide what to order and loves anything sweet. She speaks to you, not to the barista, unless you ask her to.",
    speech: "Excited, uses 哇 and 嗯…, changes her mind, asks you questions back.",
    voice: { pitch: 1.5, rate: 1.05 },
    look: {
      skin: "#fbe2d2",
      hair: { style: "twintails", color: "#2b2238", shade: "#18121f" },
      eyes: { color: "#c0477f", shape: "round" },
      outfit: { style: "hoodie", main: "#f4a6c4", accent: "#ffffff", shirt: "#fde7f0" },
      accessories: ["freckles"],
    },
  },
  wangshushu: {
    id: "wangshushu",
    name: "Wáng shūshu",
    hanzi: "王叔叔",
    role: "night-shift shop clerk",
    personality: "A sleepy but kind middle-aged clerk working the night shift at a convenience store. Yawns, slow, but helpful when asked clearly.",
    speech: "Short, slow, a little dry. Says 嗯 and 好的 a lot. Asks 要袋子吗？ at the till.",
    voice: { pitch: 0.75, rate: 0.9 },
    look: {
      skin: "#e8c3a2",
      hair: { style: "messy", color: "#3a3a3a", shade: "#7a7a7a" },
      eyes: { color: "#3b2c22", shape: "sleepy" },
      outfit: { style: "polo", main: "#2e64b0", accent: "#f08a24", shirt: "#ffffff" },
      accessories: ["glasses", "storeCap", "stubble"],
    },
  },
  chenayi: {
    id: "chenayi",
    name: "Chén āyí",
    hanzi: "陈阿姨",
    role: "restaurant owner",
    personality: "The loud, warm owner of a small family restaurant. Proud of her cooking, insists you try her 西红柿炒鸡蛋, treats customers like family.",
    speech: "Loud and warm, calls the student 小朋友 or 你, uses 啊 and 呢, recommends dishes enthusiastically.",
    voice: { pitch: 1.1, rate: 1.05 },
    look: {
      skin: "#f0c8a8",
      hair: { style: "curly", color: "#4a2320", shade: "#2c1412" },
      eyes: { color: "#4a2b1a", shape: "gentle" },
      outfit: { style: "redApron", main: "#c8372d", accent: "#f6d36b", shirt: "#f3efe6" },
      accessories: ["earrings", "wrinkles"],
    },
  },
  xiaoming: {
    id: "xiaoming",
    name: "Xiǎomíng",
    hanzi: "小明",
    role: "waiter (first day)",
    personality: "A nervous teenage waiter on his first day. Polite, eager, sometimes forgets things and asks the owner for help.",
    speech: "Polite and hesitant: 请问…, 对不起, 好的好的. Very short sentences.",
    voice: { pitch: 1.2, rate: 1.1 },
    look: {
      skin: "#f5d3b5",
      hair: { style: "spiky", color: "#1d1d2b", shade: "#3a3a52" },
      eyes: { color: "#2a3a5a", shape: "round" },
      outfit: { style: "waiter", main: "#222222", accent: "#a11d2b", shirt: "#ffffff" },
      accessories: ["bowTie", "sweat"],
    },
  },
  lixiansheng: {
    id: "lixiansheng",
    name: "Lǐ xiānsheng",
    hanzi: "李先生",
    role: "ticket officer",
    personality: "A very formal, precise railway ticket officer. Polite but strict about details: destination, date, time, seat, passport.",
    speech: "Formal: 您好, 请, 您要…?, states times and prices exactly. Never jokes.",
    voice: { pitch: 0.85, rate: 0.95 },
    look: {
      skin: "#ecc7a6",
      hair: { style: "neat", color: "#191919", shade: "#3a3a3a" },
      eyes: { color: "#1f1f1f", shape: "sharp" },
      outfit: { style: "uniform", main: "#1f2f57", accent: "#d4af37", shirt: "#e9eef7" },
      accessories: ["officerCap"],
    },
  },
  zhangnainai: {
    id: "zhangnainai",
    name: "Zhāng nǎinai",
    hanzi: "张奶奶",
    role: "fruit seller",
    personality: "A sharp, funny grandma who has sold fruit at the market for 40 years. Loves bargaining, pretends to be shocked by low offers, but gives in to polite customers.",
    speech: "Lively, teasing: 哎呀!, 太便宜了吧!, 好吧好吧. Short sentences, repeats prices.",
    voice: { pitch: 1.0, rate: 0.85 },
    look: {
      skin: "#ebc6a4",
      hair: { style: "bun", color: "#c9c6c2", shade: "#9a9692" },
      eyes: { color: "#4a3426", shape: "gentle" },
      outfit: { style: "cardigan", main: "#8a5a3b", accent: "#e8b04a", shirt: "#e9d8f1" },
      accessories: ["wrinkles", "flowerPin"],
    },
  },
};

export const SCENES: Scene[] = [
  {
    id: "cafe",
    name: "Café",
    hanzi: "咖啡馆",
    pinyin: "kāfēiguǎn",
    emoji: "☕",
    description: "A cosy corner café with a chalkboard menu.",
    setting: "A small, cosy café in the city on a sunny afternoon. A chalkboard menu hangs behind the counter.",
    missions: [
      {
        id: "coffee-for-two",
        title: "Coffee for two",
        brief: "You're at the café with your friend Měiměi. Order something for yourself, find out what she wants and order it too, then pay.",
        cast: ["xiaolin", "meimei"],
        goals: [
          { id: "own", text: "Order a drink for yourself" },
          { id: "ask-friend", text: "Ask Měiměi what she wants" },
          { id: "friend", text: "Order Měiměi's drink" },
          { id: "price", text: "Find out the total price" },
        ],
        facts:
          "Menu (元): 美式咖啡 18, 拿铁 22, 卡布奇诺 22, 奶茶 15, 绿茶 12, 蛋糕 20. 大杯 +3. Hot (热的) or iced (冰的). 美美 wants something sweet and cold: in the end an iced 奶茶 (冰奶茶), but only says so when the student asks her. Total = the student's drink + 15 for her iced 奶茶. Pay by phone or cash.",
        words: ["咖啡", "奶茶", "冰的", "一共", "多少钱"],
      },
      {
        id: "wifi-and-cake",
        title: "Cake and Wi-Fi",
        brief: "You want to sit and work for a while. Order a slice of cake, get the Wi-Fi password and ask for a seat by the window.",
        cast: ["xiaolin"],
        goals: [
          { id: "cake", text: "Order a slice of cake" },
          { id: "wifi", text: "Get the Wi-Fi password" },
          { id: "seat", text: "Ask to sit by the window" },
        ],
        facts:
          "Cakes: 巧克力蛋糕 (chocolate) 20元, 草莓蛋糕 (strawberry) 22元. The Wi-Fi password is 88888888 (八个八). The window seats (窗户旁边的座位) are free.",
        words: ["蛋糕", "密码", "窗户", "坐", "可以"],
      },
    ],
  },
  {
    id: "store",
    name: "Convenience store",
    hanzi: "便利店",
    pinyin: "biànlìdiàn",
    emoji: "🏪",
    description: "A bright 24-hour shop late at night.",
    setting: "A bright 24-hour convenience store at 11 pm. Fridges hum, shelves are full of snacks. The clerk is behind the counter.",
    missions: [
      {
        id: "late-snack",
        title: "Late-night snack",
        brief: "You're hungry. Buy a bottle of water and a 包子, ask the clerk to heat the 包子 up, and pay with your phone.",
        cast: ["wangshushu"],
        goals: [
          { id: "water", text: "Buy a bottle of water" },
          { id: "baozi", text: "Buy a 包子" },
          { id: "heat", text: "Ask him to heat it up" },
          { id: "pay", text: "Pay with your phone" },
        ],
        facts: "Water (水) 3元, 包子 5元, total 8元. A bag (袋子) costs 0.3元 if wanted. You can pay with 微信 or 支付宝 (phone), or cash. Heating takes one minute in the microwave.",
        words: ["水", "包子", "热一下", "手机", "付钱"],
      },
      {
        id: "dead-phone",
        title: "Dead phone",
        brief: "Your phone is almost dead. Find out where the phone chargers are, ask the price, and buy one.",
        cast: ["wangshushu"],
        goals: [
          { id: "where", text: "Ask where the chargers are" },
          { id: "price", text: "Ask how much one costs" },
          { id: "buy", text: "Buy a charger" },
        ],
        facts: "Phone chargers (充电器) are at the back, second shelf (在后面，第二排). They cost 39元. There are also power banks (充电宝) for 99元.",
        words: ["手机", "充电器", "在哪儿", "多少钱", "买"],
      },
    ],
  },
  {
    id: "restaurant",
    name: "Restaurant",
    hanzi: "饭馆",
    pinyin: "fànguǎn",
    emoji: "🍜",
    description: "A busy family restaurant with red lanterns.",
    setting: "A busy little family restaurant at dinner time, red lanterns, the smell of garlic. The owner runs the place; a new waiter takes orders.",
    missions: [
      {
        id: "dinner",
        title: "Dinner order",
        brief: "Ask what the owner recommends, order two dishes (one of them not spicy) and rice, then ask for the bill.",
        cast: ["xiaoming", "chenayi"],
        goals: [
          { id: "recommend", text: "Ask for a recommendation" },
          { id: "dishes", text: "Order two dishes" },
          { id: "not-spicy", text: "Make sure one is not spicy" },
          { id: "rice", text: "Order rice" },
          { id: "bill", text: "Ask for the bill" },
        ],
        facts:
          "Menu (元): 宫保鸡丁 38 (spicy), 麻婆豆腐 26 (spicy), 西红柿炒鸡蛋 22 (not spicy, the owner's favourite), 青菜 18 (not spicy), 酸辣汤 15 (spicy soup), 米饭 2 per bowl. The owner recommends 西红柿炒鸡蛋. The bill (买单) is the sum of what was ordered.",
        words: ["推荐", "菜", "辣", "不辣", "米饭", "买单"],
      },
      {
        id: "table-for-two",
        title: "A table for two",
        brief: "Your friend doesn't eat meat. Ask for a table for two, order two dishes without meat, and ask for some water.",
        cast: ["chenayi", "xiaoming"],
        goals: [
          { id: "table", text: "Ask for a table for two" },
          { id: "no-meat", text: "Say your friend doesn't eat meat" },
          { id: "dishes", text: "Order two dishes without meat" },
          { id: "water", text: "Ask for water" },
        ],
        facts: "There is a free table for two by the window. Dishes without meat: 西红柿炒鸡蛋 22, 麻婆豆腐 26 (usually has a little meat, can be made without), 青菜 18, 炒饭 20 (can be made without meat). Water is free (免费).",
        words: ["两个人", "桌子", "肉", "不吃", "水"],
      },
    ],
  },
  {
    id: "station",
    name: "Train station",
    hanzi: "火车站",
    pinyin: "huǒchēzhàn",
    emoji: "🚄",
    description: "A busy high-speed rail ticket hall.",
    setting: "The ticket hall of a big high-speed railway station. A departure board flickers above the ticket windows.",
    missions: [
      {
        id: "to-shanghai",
        title: "A ticket to Shanghai",
        brief: "Buy a ticket to Shanghai for tomorrow morning. Find out what time the train leaves, the price, and the platform.",
        cast: ["lixiansheng"],
        goals: [
          { id: "ticket", text: "Ask for a ticket to Shanghai tomorrow morning" },
          { id: "time", text: "Find out when the train leaves" },
          { id: "price", text: "Find out the price" },
          { id: "platform", text: "Find out the platform" },
        ],
        facts:
          "Tomorrow morning trains to 上海: G101 at 8:00 and G105 at 9:30. Second class (二等座) 553元. G101 leaves from platform 6 (6号站台), G105 from platform 8. The officer needs to see the passport (护照) before selling the ticket.",
        words: ["票", "上海", "明天", "上午", "几点", "站台"],
      },
      {
        id: "missed-train",
        title: "Missed train",
        brief: "You just missed your train to Beijing! Explain what happened, change to the next train and find out when it leaves.",
        cast: ["lixiansheng"],
        goals: [
          { id: "explain", text: "Say you missed your train to Beijing" },
          { id: "change", text: "Ask to change to the next train" },
          { id: "time", text: "Find out when it leaves" },
        ],
        facts: "The student's train to 北京 left at 10:00. The next train to 北京 is G23 at 14:20 from platform 3. Changing (改签) is free today.",
        words: ["没赶上", "北京", "下一班", "改", "几点"],
      },
    ],
  },
  {
    id: "market",
    name: "Street market",
    hanzi: "市场",
    pinyin: "shìchǎng",
    emoji: "🍎",
    description: "A lively open-air fruit market.",
    setting: "A lively open-air street market on Saturday morning. Crates of apples, bananas and oranges, hand-written price signs.",
    missions: [
      {
        id: "apples",
        title: "Bargain for apples",
        brief: "Buy two jin (斤) of apples. Ask the price, then bargain politely to get it cheaper.",
        cast: ["zhangnainai"],
        goals: [
          { id: "price", text: "Ask the price of apples" },
          { id: "bargain", text: "Bargain for a lower price" },
          { id: "buy", text: "Buy two jin of apples" },
        ],
        facts:
          "Apples (苹果) 8元 per 斤. She pretends to be shocked at low offers; she accepts 6元 or 7元 per 斤 if the student bargains politely (e.g. 太贵了, 便宜一点吧), never below 6. Two 斤 at the agreed price.",
        words: ["苹果", "斤", "太贵了", "便宜", "一点"],
      },
      {
        id: "party-fruit",
        title: "Fruit for a party",
        brief: "You're buying fruit for a party. Ask which fruit is sweetest today, buy some apples and bananas, and find out the total.",
        cast: ["zhangnainai"],
        goals: [
          { id: "sweetest", text: "Ask which fruit is sweetest" },
          { id: "apples", text: "Buy some apples" },
          { id: "bananas", text: "Buy some bananas" },
          { id: "total", text: "Find out the total price" },
        ],
        facts: "Prices per 斤: 苹果 8元, 香蕉 (bananas) 5元, 橙子 (oranges) 6元. Today the oranges are the sweetest (最甜). Total = what the student buys.",
        words: ["水果", "最甜", "香蕉", "苹果", "一共"],
      },
    ],
  },
];

export function sceneById(id: string): Scene | undefined {
  return SCENES.find((s) => s.id === id);
}

export function missionById(scene: Scene, id: string): Mission | undefined {
  return scene.missions.find((m) => m.id === id);
}

export const MAX_HEARTS = 3;
