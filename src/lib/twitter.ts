import { TwitterApi } from "twitter-api-v2";

export type PostInput = {
  text: string;
  mediaBuffer?: Buffer;
  mediaMimeType?: string;
  dryRun?: boolean;
};

export type PostResult = {
  posted: boolean;
  id?: string;
  dryRun: boolean;
  text: string;
};

function getClient(): TwitterApi | null {
  const {
    TWITTER_APP_KEY,
    TWITTER_APP_SECRET,
    TWITTER_ACCESS_TOKEN,
    TWITTER_ACCESS_SECRET,
  } = process.env;
  if (
    !TWITTER_APP_KEY ||
    !TWITTER_APP_SECRET ||
    !TWITTER_ACCESS_TOKEN ||
    !TWITTER_ACCESS_SECRET
  ) {
    return null;
  }
  return new TwitterApi({
    appKey: TWITTER_APP_KEY,
    appSecret: TWITTER_APP_SECRET,
    accessToken: TWITTER_ACCESS_TOKEN,
    accessSecret: TWITTER_ACCESS_SECRET,
  });
}

export async function postTweet(input: PostInput): Promise<PostResult> {
  const client = getClient();
  const dryRun = input.dryRun || !client;
  if (dryRun) {
    return { posted: false, dryRun: true, text: input.text };
  }

  let mediaIds: string[] | undefined;
  if (input.mediaBuffer && input.mediaMimeType) {
    const mediaId = await client!.v1.uploadMedia(input.mediaBuffer, {
      mimeType: input.mediaMimeType,
    });
    mediaIds = [mediaId];
  }

  const tweet = await client!.v2.tweet({
    text: input.text,
    ...(mediaIds
      ? { media: { media_ids: mediaIds as [string] } }
      : {}),
  });
  return { posted: true, id: tweet.data.id, dryRun: false, text: input.text };
}
