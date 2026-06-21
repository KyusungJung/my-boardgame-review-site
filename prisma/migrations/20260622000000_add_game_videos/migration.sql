CREATE TABLE "GameVideo" (
    "id" TEXT NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thumbnail" TEXT,
    "channelName" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gameId" TEXT NOT NULL,

    CONSTRAINT "GameVideo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameVideo_gameId_youtubeId_key" ON "GameVideo"("gameId", "youtubeId");
CREATE INDEX "GameVideo_gameId_createdAt_idx" ON "GameVideo"("gameId", "createdAt");

ALTER TABLE "GameVideo"
ADD CONSTRAINT "GameVideo_gameId_fkey"
FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
