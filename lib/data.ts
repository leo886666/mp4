/**
 * Seed catalogue + brand copy.
 *
 * These rows are what `lib/server/seed.ts` writes into the database on first
 * boot. After that the database is the source of truth — the app reads
 * /api/*, never this file. Keeping it here means a fresh clone still comes up
 * with a full-looking catalogue.
 */

export interface SeedGenre { id: string; name: string }
export interface SeedCreator { id: string; name: string; initials: string; role: string; followers: string }
export interface SeedPlan {
  id: string; name: string; price: number; perMonth?: number; period: string;
  badge?: string; highlight?: boolean; savings?: string;
}
export interface SeedDrama {
  id: string; title: string; genre: string; tags: string[]; cover: string; hero?: string;
  rating: number; views: number; episodes: number; freeEpisodes: number;
  status: "Ongoing" | "Completed"; updatedLabel: string; synopsis: string; creator: string; isNew?: boolean;
}

export const BRAND = "VESPER";
export const TAGLINE = "Stories that fit your night.";

export const GENRES: SeedGenre[] = [
  { id: "romance", name: "Romance" },
  { id: "billionaire", name: "Billionaire" },
  { id: "revenge", name: "Revenge" },
  { id: "royal", name: "Royal" },
  { id: "mafia", name: "Mafia" },
  { id: "thriller", name: "Thriller" },
  { id: "supernatural", name: "Supernatural" },
  { id: "fantasy", name: "Fantasy" },
  { id: "campus", name: "Campus" },
  { id: "medical", name: "Medical" },
  { id: "family", name: "Family" },
  { id: "arts", name: "Arts" },
  { id: "retro", name: "Retro" },
];

export const genreName = (id: string) => GENRES.find((g) => g.id === id)?.name ?? id;

export const CREATORS: SeedCreator[] = [
  { id: "emberlight", name: "Emberlight Studio", initials: "ES", role: "Premium Studio", followers: "1.2M" },
  { id: "nova-reels", name: "Nova Reels", initials: "NR", role: "Creator", followers: "684K" },
  { id: "goldleaf", name: "Goldleaf Pictures", initials: "GL", role: "Premium Studio", followers: "932K" },
  { id: "quill", name: "Quill & Co.", initials: "QC", role: "Creator", followers: "217K" },
  { id: "midnight", name: "Midnight House", initials: "MH", role: "Premium Studio", followers: "1.7M" },
  { id: "atlas", name: "Atlas Dramas", initials: "AD", role: "Creator", followers: "458K" },
];

function d(
  id: string, title: string, genre: string, tags: string[], rating: number,
  views: number, episodes: number, freeEpisodes: number, status: SeedDrama["status"],
  updatedLabel: string, synopsis: string, creator: string, isNew = false,
  hero?: string
): SeedDrama {
  return {
    id, title, genre, tags, cover: `/covers/${id}.jpg`, hero, rating, views, episodes,
    freeEpisodes, status, updatedLabel, synopsis, creator, isNew,
  };
}

export const DRAMAS: SeedDrama[] = [
  d("midnight-vows", "Midnight Vows", "romance", ["Arranged Marriage", "Slow Burn"], 9.6, 48200000, 68, 3, "Ongoing", "Updated Tue & Fri",
    "A fashion heiress marries a stranger to save her family's atelier — and discovers the contract came with one condition she never agreed to: fall in love.", "emberlight", false, "/hero/red-carpet"),
  d("second-chance-city", "Second Chance City", "romance", ["Second Chance", "City Nights"], 9.2, 21300000, 54, 3, "Completed", "Full season",
    "Ten years after walking away, she returns to the city that made her — and to the man who never stopped waiting on the same rooftop.", "nova-reels", false, "/hero/night-city"),
  d("city-lights-confession", "City Lights, Quiet Confessions", "romance", ["Wholesome", "Slow Burn"], 9.0, 9800000, 40, 4, "Ongoing", "Updated daily",
    "Two strangers keep missing each other by minutes in a city of nine million. Tonight the city finally gives in.", "quill", true),
  d("written-in-the-stars", "Written in the Stars", "romance", ["Destiny", "Soulmates"], 8.8, 15600000, 47, 3, "Ongoing", "Updated Mon & Thu",
    "An astronomer who stopped believing in fate meets a street musician who never did — under the same sky, one impossible summer.", "goldleaf"),
  d("the-last-heir", "The Last Heir", "billionaire", ["Dynasty", "Hidden Identity"], 9.5, 62400000, 82, 3, "Ongoing", "Updated daily",
    "Disowned and written off, the youngest heir of a hotel empire returns incognito as a night concierge — to expose who buried his father's will.", "midnight", false, "/hero/penthouse"),
  d("steel-and-silk", "Steel & Silk", "billionaire", ["Contract Love", "Power"], 9.3, 37100000, 71, 3, "Ongoing", "Updated Tue & Sat",
    "A private banker clauses her way into a marriage of convenience with the most guarded man in Manhattan. Every clause has an escape hatch. He wrote one for her.", "emberlight"),
  d("cold-pursuit", "Cold Pursuit", "billionaire", ["Chase", "Ice CEO"], 9.1, 18900000, 58, 3, "Ongoing", "Updated Wed",
    "He has forty days to close the acquisition. She owns the one vineyard he can't buy. Love was never part of the term sheet.", "atlas"),
  d("after-dark", "After Dark", "billionaire", ["Noir", "Secrets"], 8.9, 12500000, 44, 3, "Completed", "Full season",
    "By day he runs a fashion house. After dark he settles debts the city pretends don't exist. She was hired to photograph both.", "midnight"),
  d("boardroom-queen", "Boardroom Queen", "billionaire", ["Girl Boss", "Office"], 9.4, 28800000, 63, 3, "Ongoing", "Updated daily",
    "They buried her promotion under a rival's name. So she built her own board — and invited every one of them to the meeting that ends their careers.", "goldleaf"),
  d("her-silent-revenge", "Her Silent Revenge", "revenge", ["Revenge", "Slow Burn"], 9.7, 71500000, 88, 3, "Ongoing", "Updated daily",
    "She disappeared the night of the accident. Five years later she walks back into their lives with a new face, a new name, and a list.", "midnight", false),
  d("the-runaway-bride", "The Runaway Bride", "revenge", ["Wedding", "Betrayal"], 9.2, 33900000, 66, 3, "Ongoing", "Updated Tue & Fri",
    "At the altar she learned the truth about the crash. She said yes anyway — the vows were step one.", "emberlight"),
  d("golden-hour-lies", "Golden Hour Lies", "revenge", ["Mystery", "Grief"], 9.0, 14200000, 52, 3, "Completed", "Full season",
    "Her sister's last photograph holds a face no one will name. She has one summer to make them say it out loud.", "quill"),
  d("fragments-of-her", "Fragments of Her", "revenge", ["Amnesia", "Twist"], 9.3, 22700000, 60, 3, "Ongoing", "Updated Mon",
    "Every night she forgets the day. Every day someone feeds her a different past. One of them is lying.", "atlas"),
  d("the-gilded-cage", "The Gilded Cage", "royal", ["Palace", "Court"], 9.5, 45600000, 74, 3, "Ongoing", "Updated Wed & Sun",
    "The emperor's bride arrives with golden gowns and no allies. The court calls her a dove. Doves carry messages — and she carries war.", "goldleaf"),
  d("crown-of-thorns", "Crown of Thorns", "royal", ["Queen", "Intrigue"], 9.4, 31200000, 69, 3, "Ongoing", "Updated daily",
    "A servant girl wears the crown for one night to save the true heir. The kingdom decides she wears it rather well.", "midnight"),
  d("empress-in-exile", "Empress in Exile", "royal", ["Epic", "Return"], 9.1, 19800000, 57, 3, "Ongoing", "Updated Fri",
    "Stripped of her title and shipped across the sea, the exiled empress returns seven years later with an army — and a wedding invitation.", "nova-reels"),
  d("the-dons-daughter", "The Don's Daughter", "mafia", ["Crime Family", "Arranged"], 9.6, 53800000, 77, 3, "Ongoing", "Updated daily",
    "The don's daughter was raised on rules: never cry in public, never love a soldier, never leave the table first. Tonight she breaks all three.", "midnight"),
  d("smoke-and-shadows", "Smoke & Shadows", "mafia", ["Noir", "Undercover"], 9.2, 24400000, 61, 3, "Ongoing", "Updated Thu",
    "An undercover detective climbs the ranks of the family he swore to burn. The don's consigliere already knows — and says nothing.", "emberlight"),
  d("blood-oath", "Blood Oath", "mafia", ["Brotherhood", "Betrayal"], 9.0, 16500000, 49, 3, "Completed", "Full season",
    "Two brothers, one oath, and a seat at the table that only fits one of them.", "atlas"),
  d("one-more-summer", "One More Summer", "retro", ["Nostalgia", "First Love"], 9.4, 20100000, 46, 4, "Ongoing", "Updated Tue",
    "A late-90s summer, a borrowed camera, and a promise made on a fire escape that took twenty-five years to keep.", "quill"),
  d("the-quiet-room", "The Quiet Room", "retro", ["Period", "Elegance"], 8.9, 8700000, 38, 3, "Completed", "Full season",
    "In a 1960s grand hotel, a chambermaid keeps the letters guests are too afraid to send — until one is addressed to her.", "quill"),
  d("rain-on-fifth", "Rain on Fifth", "retro", ["Noir Romance", "City"], 9.1, 13900000, 43, 3, "Ongoing", "Updated Sat",
    "Every Tuesday it rains on Fifth Avenue, and every Tuesday he is one umbrella too late.", "nova-reels"),
  d("first-love-second-chance", "First Love, Second Chance", "campus", ["School", "Sweet"], 9.2, 26300000, 55, 4, "Ongoing", "Updated daily",
    "The boy who shared his notes is now the professor's TA — and the girl he never forgot just transferred in.", "goldleaf"),
  d("code-blue", "Code Blue", "medical", ["Hospital", "High Stakes"], 9.3, 17800000, 64, 3, "Ongoing", "Updated Wed & Sun",
    "A trauma surgeon with a 97% survival rate is hiding the one patient she couldn't save: her own name is on the chart.", "atlas"),
  d("the-masked-stranger", "The Masked Stranger", "supernatural", ["Mystery", "Curse"], 9.5, 41900000, 72, 3, "Ongoing", "Updated daily",
    "Every masque has one guest who never removes his mask. This year, he asks her to dance — and the candles lean in to listen.", "midnight"),
  d("cursed-by-the-moon", "Cursed by the Moon", "supernatural", ["Werewolf", "Fated Mates"], 9.6, 58700000, 85, 3, "Ongoing", "Updated daily",
    "The pack's outlawed Luna returns on a blood moon with a debt the alpha never expected: his name, on a contract older than the forest.", "midnight", false, "/hero/moonlit-forest"),
  d("cathedral-vows", "Cathedral Vows", "supernatural", ["Gothic", "Immortal"], 9.0, 11600000, 51, 3, "Ongoing", "Updated Fri",
    "He has attended every wedding in the cathedral for two hundred years, always in the last pew. Tonight he is the groom.", "emberlight"),
  d("candlelight-confessions", "Candlelight Confessions", "supernatural", ["Gothic", "Secrets"], 8.8, 7400000, 36, 3, "Completed", "Full season",
    "In a house where the candles burn blue for lies, a widow learns her marriage told the truth only after he was gone.", "quill"),
  d("sisters-of-the-night", "Sisters of the Night", "supernatural", ["Witches", "Sisterhood"], 9.2, 15800000, 48, 3, "Ongoing", "Updated Mon & Thu",
    "Three sisters. One candelabra. Whoever blows it out inherits the house — and the thing that lives under it.", "nova-reels"),
  d("mothers-promise", "Mother's Promise", "family", ["Emotional", "Sacrifice"], 9.7, 39400000, 59, 4, "Ongoing", "Updated Tue & Sat",
    "A deployed medic records one video letter per deployment. Her son has kept every one. The last one arrives ten years late.", "goldleaf"),
  d("the-homecoming", "The Homecoming", "family", ["Healing", "Warm"], 9.1, 10300000, 42, 3, "Completed", "Full season",
    "She left home at nineteen with a suitcase and a grudge. The suitcase came back empty. The grudge didn't.", "atlas"),
  d("neighbor-in-4b", "Neighbor in 4B", "thriller", ["Suspense", "Urban"], 9.4, 29700000, 67, 3, "Ongoing", "Updated daily",
    "The man in 4B waters his plants at 3 a.m. and never sleeps. Neither does she — now.", "midnight", false, "/hero/neon-district"),
  d("scar-tissue", "Scar Tissue", "thriller", ["Crime", "Hard-boiled"], 9.2, 16900000, 56, 3, "Ongoing", "Updated Thu",
    "A boxer takes a fall to pay his brother's debt. The brother watches from the third row — wearing the promoter's jacket.", "atlas"),
  d("storm-watch", "Storm Watch", "thriller", ["Disaster", "Survival"], 9.0, 12100000, 45, 3, "Ongoing", "Updated Wed",
    "The hurricane is three hours out. The lighthouse keeper just found a body that isn't supposed to exist.", "nova-reels"),
  d("the-sultans-blade", "The Sultan's Blade", "fantasy", ["Epic", "Warrior"], 9.3, 28100000, 70, 3, "Ongoing", "Updated Sat",
    "The empire's greatest blade is a woman the histories erased. She has returned to correct them — in her own hand.", "goldleaf"),
  d("desert-rose", "Desert Rose", "fantasy", ["Epic", "Caravan"], 9.1, 14700000, 53, 3, "Ongoing", "Updated Tue",
    "A caravan master who can read the stars smuggles one secret across the dunes: the true heir, asleep in a merchant's chest.", "atlas"),
  d("spotlight", "Spotlight", "arts", ["Dance", "Stage"], 9.2, 13500000, 50, 3, "Ongoing", "Updated Fri",
    "The company's lead is retiring at the end of the season. Her understudy has waited nine years — and rehearsed a different ending.", "emberlight"),
  d("ember-dancer", "Ember Dancer", "arts", ["Dance", "Passion"], 9.4, 22400000, 62, 3, "Ongoing", "Updated daily",
    "She dances like the floor is on fire because, in her family, it always was. The stage is the only place nobody can hold her back.", "emberlight"),
  d("swan-song", "Swan Song", "arts", ["Ballet", "Tragedy"], 9.0, 9200000, 39, 3, "Completed", "Full season",
    "One final performance. One final lie. The audience sees a swan; the wings remember everything.", "quill"),
];

export const byId = (id: string) => DRAMAS.find((x) => x.id === id);

export const HERO_IDS = [
  "her-silent-revenge",
  "the-last-heir",
  "cursed-by-the-moon",
  "midnight-vows",
  "neighbor-in-4b",
];

export const TRENDING_IDS = [
  "her-silent-revenge", "the-dons-daughter", "cursed-by-the-moon", "the-last-heir",
  "mothers-promise", "boardroom-queen", "the-runaway-bride", "smoke-and-shadows",
  "the-gilded-cage", "first-love-second-chance",
];

export const PLANS: SeedPlan[] = [
  { id: "weekly", name: "Weekly", price: 6.99, period: "week", savings: "Flexible" },
  { id: "monthly", name: "Monthly", price: 19.9, period: "month", badge: "Most Popular", highlight: true },
  { id: "quarterly", name: "Quarterly", price: 49.9, period: "3 months", perMonth: 16.63, badge: "Save 17%", savings: "≈ $16.63/mo · save 17%" },
  { id: "annual", name: "Annual", price: 99.9, period: "year", perMonth: 8.33, badge: "Best Value", savings: "≈ $8.33/mo · save 58%" },
];

export const VIP_BENEFITS = [
  { title: "Everything unlocked", desc: "Every episode of every series — no coins, no keys, no waiting." },
  { title: "Zero ads", desc: "Pure story, start to finish. Not a single interstitial." },
  { title: "Early access", desc: "New episodes up to 72 hours before the free tier." },
  { title: "Offline downloads", desc: "Save any series and watch on the subway, the plane, anywhere." },
  { title: "4K streaming", desc: "Adaptive bitrate up to 4K when your network allows." },
  { title: "Cancel anytime", desc: "No lock-in, no fine print. One tap in Settings." },
];

export const FAQS = [
  { q: "What's included in VESPER VIP?", a: "Unlimited access to the full catalog, ad-free playback, early access to new episodes, offline downloads, and 4K streaming where available." },
  { q: "Do free episodes still exist?", a: "Yes. Every series opens with free episodes and new free picks rotate weekly. VIP simply removes every limit." },
  { q: "Can I cancel anytime?", a: "Yes — one tap in Settings > Membership. You keep access until the end of your billing period. No cancellation fees." },
  { q: "How do I restore a purchase?", a: "Open Settings > Membership > Restore purchases. Sign in with the same account and your plan reattaches automatically." },
];
