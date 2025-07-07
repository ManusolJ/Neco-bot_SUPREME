export default interface RedditREST {
  kind: string;
  data: RedditRESTData;
}

export interface RedditRESTData {
  after: null;
  dist: number;
  modhash: string;
  geo_filter: string;
  children: Child[];
  before: null;
}

export interface Child {
  kind: string;
  data: ChildData;
}

export interface ChildData {
  approved_at_utc: null;
  subreddit: string;
  selftext: string;
  author_fullname: string;
  saved: boolean;
  mod_reason_title: null;
  gilded: number;
  clicked: boolean;
  title: string;
  link_flair_richtext: any[];
  subreddit_name_prefixed: string;
  hidden: boolean;
  pwls: null;
  link_flair_css_class: null | string;
  downs: number;
  thumbnail_height: null;
  top_awarded_type: null;
  hide_score: boolean;
  name: string;
  quarantine: boolean;
  link_flair_text_color: string;
  upvote_ratio: number;
  author_flair_background_color: null;
  subreddit_type: string;
  ups: number;
  total_awards_received: number;
  media_embed: Gildings;
  thumbnail_width: null;
  author_flair_template_id: null;
  is_original_content: boolean;
  user_reports: any[];
  secure_media: null;
  is_reddit_media_domain: boolean;
  is_meta: boolean;
  category: null;
  secure_media_embed: Gildings;
  link_flair_text: null | string;
  can_mod_post: boolean;
  score: number;
  approved_by: null;
  is_created_from_ads_ui: boolean;
  author_premium: boolean;
  thumbnail: string;
  edited: boolean | number;
  author_flair_css_class: null;
  author_flair_richtext: any[];
  gildings: Gildings;
  content_categories: null;
  is_self: boolean;
  mod_note: null;
  created: number;
  link_flair_type: string;
  wls: null;
  removed_by_category: null;
  banned_by: null;
  author_flair_type: string;
  domain: string;
  allow_live_comments: boolean;
  selftext_html: string;
  likes: null;
  suggested_sort: string;
  banned_at_utc: null;
  view_count: null;
  archived: boolean;
  no_follow: boolean;
  is_crosspostable: boolean;
  pinned: boolean;
  over_18: boolean;
  all_awardings: any[];
  awarders: any[];
  media_only: boolean;
  can_gild: boolean;
  spoiler: boolean;
  locked: boolean;
  author_flair_text: null;
  treatment_tags: any[];
  visited: boolean;
  removed_by: null;
  num_reports: null;
  distinguished: null;
  subreddit_id: string;
  author_is_blocked: boolean;
  mod_reason_by: null;
  removal_reason: null;
  link_flair_background_color: string;
  id: string;
  is_robot_indexable: boolean;
  report_reasons: null;
  author: string;
  discussion_type: null;
  num_comments: number;
  send_replies: boolean;
  contest_mode: boolean;
  mod_reports: any[];
  author_patreon_flair: boolean;
  author_flair_text_color: null;
  permalink: string;
  stickied: boolean;
  url: string;
  subreddit_subscribers: number;
  created_utc: number;
  num_crossposts: number;
  media: null;
  is_video: boolean;
  post_hint?: string;
  preview?: Preview;
  link_flair_template_id?: string;
}

export interface Gildings {}

export interface Preview {
  images: Image[];
  enabled: boolean;
}

export interface Image {
  source: Source;
  resolutions: Source[];
  variants: Gildings;
  id: string;
}

export interface Source {
  url: string;
  width: number;
  height: number;
}
