"use client";

import {
  Alert,
  App,
  Avatar,
  Button,
  Card,
  Col,
  ConfigProvider,
  Divider,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  Layout,
  List,
  Menu,
  Modal,
  Rate,
  Radio,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import {
  BookOutlined,
  DashboardOutlined,
  LockOutlined,
  LogoutOutlined,
  MenuOutlined,
  InboxOutlined,
  PlusOutlined,
  SearchOutlined,
  ShareAltOutlined,
  TagsOutlined,
  TeamOutlined,
  YoutubeOutlined,
} from "@ant-design/icons";
import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import type { BoardGameMetadata, BoardlifeSearchResult, CollectionGame, GameVideo } from "@/lib/types";

const { Header, Sider, Content } = Layout;
const pageMetadata = {
  dashboard: { title: "대시보드", description: "내 보드게임 컬렉션 현황을 한눈에 관리하세요." },
  collection: { title: "게임 목록", description: "등록한 보드게임과 플레이 기록을 확인하세요." },
  tags: { title: "태그 관리", description: "컬렉션을 분류하는 태그를 확인하고 관리하세요." },
  recommend: { title: "모임 추천", description: "참가 인원과 연령에 맞는 게임을 찾아보세요." },
  registration: { title: "게임 추가", description: "Boardlife에서 게임을 찾아 컬렉션에 등록하세요." },
  detail: { title: "게임 상세", description: "보드게임 정보와 플레이 기록을 확인하세요." },
};

const statusLabel = { owned: "보유", wishlist: "위시리스트", played: "플레이 완료" } as const;

function Cover({ game, size = "regular" }: { game: Pick<BoardlifeSearchResult, "title" | "image" | "thumbnail">; size?: "small" | "regular" }) {
  const imageUrl = game.image || game.thumbnail;
  return imageUrl ? <img className={`cover ${size}`} src={imageUrl} alt={`${game.title} 표지`} /> : <div className={`cover ${size} cover-fallback`} aria-label={`${game.title} 표지 없음`}>{game.title.slice(0, 2)}</div>;
}

function videoIdFromUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.hostname === "youtu.be") return url.pathname.slice(1) || null;
    if (url.hostname.endsWith("youtube.com")) return url.searchParams.get("v") || url.pathname.match(/\/(?:embed|shorts)\/([^/]+)/)?.[1] || null;
  } catch {
    return null;
  }
  return null;
}

export function BoardShelfApp() {
  const [collection, setCollection] = useState<CollectionGame[]>([]);
  const [query, setQuery] = useState("");
  const [collectionQuery, setCollectionQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [candidates, setCandidates] = useState<BoardlifeSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BoardGameMetadata | null>(null);
  const [viewingGame, setViewingGame] = useState<CollectionGame | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingDetail, startDetailTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [people, setPeople] = useState(4);
  const [age, setAge] = useState(10);
  const [recommendationOpen, setRecommendationOpen] = useState(false);
  const [photoGalleryGame, setPhotoGalleryGame] = useState<CollectionGame | null>(null);
  const [tagGallery, setTagGallery] = useState<{ tag: string; games: CollectionGame[]; sortLabel: string } | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [photoCaption, setPhotoCaption] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [videoCandidates, setVideoCandidates] = useState<GameVideo[]>([]);
  const [searchingVideos, setSearchingVideos] = useState(false);
  const [videoSearchError, setVideoSearchError] = useState<string | null>(null);
  const [manualVideoUrl, setManualVideoUrl] = useState("");
  const [form] = Form.useForm<CollectionGame>();
  const selectedVideos = Form.useWatch("videos", form) ?? [];
  const [messageApi, messageContext] = message.useMessage();

  useEffect(() => {
    async function loadDashboardData() {
      const [gamesResponse, sessionResponse] = await Promise.all([fetch("/api/games"), fetch("/api/auth/session")]);
      if (gamesResponse.ok) setCollection(await gamesResponse.json() as CollectionGame[]);
      else setCollection([]);
      if (sessionResponse.ok) setIsAdmin((await sessionResponse.json() as { authenticated: boolean }).authenticated);
    }
    void loadDashboardData();
  }, []);

  useEffect(() => {
    if (deferredQuery.trim().length < 2) {
      setCandidates([]);
      setSearchError(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const response = await fetch(`/api/boardlife/search?word=${encodeURIComponent(deferredQuery)}`, { signal: controller.signal });
        const result = await response.json() as BoardlifeSearchResult[] | { message?: string };
        if (!response.ok) throw new Error("message" in result ? result.message : "Boardlife 검색에 실패했습니다.");
        setCandidates(Array.isArray(result) ? result : []);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setCandidates([]);
          setSearchError(error instanceof Error ? error.message : "Boardlife 검색에 실패했습니다.");
        }
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [deferredQuery]);

  const recommendations = useMemo(() => collection
    .filter((game) => (game.minPlayers ?? 1) <= people && (game.maxPlayers ?? 99) >= people && (game.minAge ?? 0) <= age)
    .toSorted((first, second) => {
      const firstScore = (first.bestPlayers === people ? 5 : 0) + (first.personalRating ?? 0) + Math.min(first.plays, 5) / 10;
      const secondScore = (second.bestPlayers === people ? 5 : 0) + (second.personalRating ?? 0) + Math.min(second.plays, 5) / 10;
      return secondScore - firstScore;
    }), [age, collection, people]);

  const collectionTags = useMemo(() => [...new Set(collection.flatMap((game) => game.tags))].toSorted(), [collection]);
  const recentGames = useMemo(() => collection.toSorted((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()).slice(0, 5), [collection]);
  const filteredCollection = useMemo(() => {
    const normalizedQuery = collectionQuery.trim().toLocaleLowerCase("ko");
    if (!normalizedQuery) return collection;
    return collection.filter((game) => [game.title, game.englishTitle, ...game.tags].some((value) => value.toLocaleLowerCase("ko").includes(normalizedQuery)));
  }, [collection, collectionQuery]);
  const popularTagGroups = useMemo(() => {
    const gamesByTag = new Map<string, CollectionGame[]>();
    for (const game of collection) {
      for (const tag of game.tags) {
        const games = gamesByTag.get(tag) ?? [];
        games.push(game);
        gamesByTag.set(tag, games);
      }
    }
    return [...gamesByTag.entries()]
      .map(([tag, games]) => {
        const dashboardGames = games.toSorted((first, second) => (second.personalRating ?? 0) - (first.personalRating ?? 0) || second.plays - first.plays);
        const rankedGames = games.toSorted((first, second) => (second.personalRating ?? 0) - (first.personalRating ?? 0) || second.plays - first.plays);
        return { tag, count: games.length, games: dashboardGames.slice(0, 5), rankedGames };
      })
      .toSorted((first, second) => second.count - first.count || first.tag.localeCompare(second.tag, "ko"))
      .slice(0, 3);
  }, [collection]);

  const isEditingSelected = selected ? collection.some((game) => game.id === selected.id) : false;
  const currentPage = activeMenu === "registration" && isEditingSelected
    ? { title: "게임 수정", description: "등록한 보드게임 정보를 수정하세요." }
    : pageMetadata[activeMenu as keyof typeof pageMetadata] ?? pageMetadata.dashboard;

  function changePage(key: string) {
    if (!(key in pageMetadata)) return;
    setActiveMenu(key);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function chooseCandidate(candidate: BoardlifeSearchResult) {
    setQuery(candidate.title);
    setCandidates([]);
    startDetailTransition(async () => {
      try {
        const response = await fetch(`/api/boardlife/game/${candidate.id}`);
        const detail = await response.json() as BoardGameMetadata;
        if (!response.ok) throw new Error("상세 조회 실패");
        const resolved = { ...candidate, ...detail, image: detail.image || candidate.image, thumbnail: detail.thumbnail || candidate.thumbnail };
        setSelected(resolved);
        form.setFieldsValue({ ...resolved, tags: resolved.autoTags ?? [], personalRating: 0, review: "", plays: 0, status: "owned", videos: [], createdAt: new Date().toISOString() });
        void searchRelatedVideos(resolved, true);
      } catch {
        messageApi.error("상세 정보를 읽지 못했습니다. 직접 입력할 수 있습니다.");
        const fallback: BoardGameMetadata = { ...candidate, sourceUrl: `https://boardlife.co.kr/game/${candidate.id}`, sourceFetchedAt: new Date().toISOString() };
        setSelected(fallback);
        form.setFieldsValue({ ...fallback, tags: [], personalRating: 0, review: "", plays: 0, status: "owned", videos: [], createdAt: new Date().toISOString() });
        void searchRelatedVideos(fallback, true);
      }
    });
  }

  function editGame(game: CollectionGame) {
    setSelected(game);
    setQuery("");
    form.setFieldsValue({ ...game, status: game.status ?? "owned" });
    setVideoCandidates([]);
    setVideoSearchError(null);
    void searchRelatedVideos(game, false);
    changePage("registration");
  }

  function openGame(game: CollectionGame) {
    if (isAdmin) {
      editGame(game);
      return;
    }
    setViewingGame(game);
    changePage("detail");
  }

  function viewGameDetail(game: CollectionGame) {
    setViewingGame(game);
    changePage("detail");
  }

  function openTagGames(tag: string) {
    const games = collection.filter((game) => game.tags.includes(tag)).toSorted((first, second) => second.plays - first.plays || (second.personalRating ?? 0) - (first.personalRating ?? 0));
    setTagGallery({ tag, games, sortLabel: "플레이 횟수 많은 순" });
  }

  async function uploadPlayPhoto(file?: File) {
    if (!file || !selected || !isEditingSelected) return;
    setUploadingPhoto(true);
    try {
      if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) throw new Error("10MB 이하의 JPG, PNG, WebP, GIF 파일만 업로드할 수 있습니다.");
      const blob = await upload(`game-photos/${selected.id}/${file.name}`, file, { access: "public", handleUploadUrl: "/api/blob/upload" });
      const response = await fetch(`/api/games/${selected.id}/photos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: blob.url, pathname: blob.pathname, caption: photoCaption }) });
      const photo = await response.json();
      if (!response.ok) throw new Error(photo.message ?? "사진을 업로드하지 못했습니다.");
      const updated = { ...(selected as CollectionGame), photos: [photo, ...(selected as CollectionGame).photos] };
      setSelected(updated);
      setCollection((current) => current.map((game) => game.id === updated.id ? updated : game));
      setPhotoCaption("");
      messageApi.success("플레이 사진을 추가했습니다.");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "사진을 업로드하지 못했습니다.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function deletePlayPhoto(photoId: string) {
    if (!selected) return;
    try {
      const response = await fetch(`/api/games/${selected.id}/photos?photoId=${encodeURIComponent(photoId)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("사진을 삭제하지 못했습니다.");
      const updated = { ...(selected as CollectionGame), photos: (selected as CollectionGame).photos.filter((photo) => photo.id !== photoId) };
      setSelected(updated);
      setCollection((current) => current.map((game) => game.id === updated.id ? updated : game));
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "사진을 삭제하지 못했습니다.");
    }
  }

  async function searchRelatedVideos(game: Pick<BoardGameMetadata, "title" | "englishTitle">, autoAdd: boolean) {
    setSearchingVideos(true);
    setVideoSearchError(null);
    try {
      const searchParams = new URLSearchParams({ title: game.title, englishTitle: game.englishTitle ?? "" });
      const response = await fetch(`/api/youtube/search?${searchParams}`);
      const result = await response.json() as GameVideo[] | { message?: string };
      if (!response.ok) throw new Error("message" in result ? result.message : "YouTube 영상 검색에 실패했습니다.");
      const videos = Array.isArray(result) ? result : [];
      setVideoCandidates(videos);
      if (autoAdd && videos.length) form.setFieldValue("videos", videos.slice(0, 3));
    } catch (error) {
      setVideoCandidates([]);
      setVideoSearchError(error instanceof Error ? error.message : "YouTube 영상 검색에 실패했습니다.");
    } finally {
      setSearchingVideos(false);
    }
  }

  function toggleVideo(video: GameVideo) {
    const hasVideo = selectedVideos.some((item) => item.youtubeId === video.youtubeId);
    form.setFieldValue("videos", hasVideo ? selectedVideos.filter((item) => item.youtubeId !== video.youtubeId) : [...selectedVideos, video]);
  }

  function addManualVideo() {
    const youtubeId = videoIdFromUrl(manualVideoUrl);
    if (!youtubeId) {
      messageApi.error("올바른 YouTube 영상 링크를 입력하세요.");
      return;
    }
    if (selectedVideos.some((video) => video.youtubeId === youtubeId)) {
      messageApi.info("이미 연결한 영상입니다.");
      return;
    }
    form.setFieldValue("videos", [...selectedVideos, {
      youtubeId,
      url: `https://www.youtube.com/watch?v=${youtubeId}`,
      title: "직접 추가한 YouTube 영상",
      thumbnail: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    }]);
    setManualVideoUrl("");
  }

  async function saveGame(values: CollectionGame) {
    if (!selected) return;
    const wasEditing = isEditingSelected;
    const game: CollectionGame = { ...selected, ...values, id: selected.id, title: values.title || selected.title, sourceUrl: selected.sourceUrl, sourceFetchedAt: selected.sourceFetchedAt, createdAt: new Date().toISOString() };
    setSaving(true);
    try {
      const response = await fetch("/api/games", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(game) });
      const savedGame = await response.json() as CollectionGame | { message: string };
      if (!response.ok) throw new Error("message" in savedGame ? savedGame.message : "저장에 실패했습니다.");
      const persistedGame = savedGame as CollectionGame;
      setCollection((current) => [persistedGame, ...current.filter((item) => item.id !== persistedGame.id)]);
      messageApi.success(wasEditing ? `${persistedGame.title} 수정이 완료되었습니다.` : `${persistedGame.title}을(를) 저장했습니다.`);
      setSelected(null);
      setQuery("");
      form.resetFields();
      changePage("dashboard");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "게임을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function login() {
    setLoggingIn(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: loginPassword }) });
      if (!response.ok) throw new Error("관리자 비밀번호가 올바르지 않습니다.");
      setIsAdmin(true);
      setLoginPassword("");
      messageApi.success("관리자 모드로 전환했습니다.");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally {
      setLoggingIn(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAdmin(false);
    setSelected(null);
    form.resetFields();
  }

  async function shareCollection() {
    const url = window.location.origin;
    const shareData = { title: "Board Shelf 컬렉션", text: `보드게임 컬렉션 ${collection.length}개를 확인해 보세요.`, url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(url);
      messageApi.success("컬렉션 주소를 클립보드에 복사했습니다.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      messageApi.error("공유 주소를 복사하지 못했습니다.");
    }
  }

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#1677ff", borderRadius: 8, fontFamily: "var(--font-sans)" } }}>
      <App>{messageContext}
        <Layout className="app-shell">
          <Sider width={236} trigger={null} className="side-nav">
            <div className="brand">Board <span>Shelf</span></div>
            <Menu theme="dark" mode="inline" selectedKeys={[activeMenu]} onClick={({ key }) => changePage(key)} items={[
              { key: "dashboard", icon: <DashboardOutlined />, label: "대시보드" },
              { key: "collection", icon: <BookOutlined />, label: "게임 목록" },
              { key: "tags", icon: <TagsOutlined />, label: "태그 관리" },
              { key: "recommend", icon: <TeamOutlined />, label: "모임 추천" },
            ]} />
            <div className="side-bottom">{isAdmin ? <Button type="primary" block icon={<PlusOutlined />} onClick={() => changePage("registration")}>게임 추가</Button> : <Button type="primary" block icon={<LockOutlined />} onClick={() => changePage("registration")}>관리자 로그인</Button>}<Button type="text" block icon={<ShareAltOutlined />} onClick={() => void shareCollection()}>전체 컬렉션 공유</Button>{isAdmin && <Button type="text" block icon={<LogoutOutlined />} onClick={() => void logout()}>관리자 로그아웃</Button>}</div>
          </Sider>
          <Layout>
            <Header className="top-header"><div className="page-heading"><Button className="mobile-nav-trigger" type="text" icon={<MenuOutlined />} aria-label="메뉴 열기" onClick={() => setMobileNavOpen(true)} /><div><Typography.Title level={2}>{currentPage.title}</Typography.Title><Typography.Text type="secondary">{currentPage.description}</Typography.Text></div></div><Avatar style={{ background: "#e6f4ff", color: "#0958d9" }}>KJ</Avatar></Header>
            <Content id="dashboard" className="content-area">
              <Row gutter={[20, 20]}>
                {activeMenu !== "registration" && <Col xs={24} xl={24}>
                  <div hidden={activeMenu !== "dashboard"}><Card className="section-card" title="컬렉션 요약">
                    <Row gutter={[12, 12]}>
                      <Col xs={24} sm={8}><Statistic title="보유 게임" value={collection.length} suffix="개" /></Col>
                      <Col xs={24} sm={8}><Statistic title="총 플레이" value={collection.reduce((sum, game) => sum + game.plays, 0)} suffix="회" /></Col>
                      <Col xs={24} sm={8}><Statistic title="태그" value={collectionTags.length} suffix="개" /></Col>
                    </Row>
                  </Card><Card className="section-card recent-games-card" title="최근 등록">{recentGames.length ? <div className="recent-game-row">{recentGames.map((game) => <button type="button" key={game.id} onClick={() => viewGameDetail(game)}><Cover game={game} size="small" /><Typography.Text strong ellipsis>{game.title}</Typography.Text></button>)}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="최근 등록한 게임이 없습니다." />}</Card>{popularTagGroups.length ? <div className="tag-dashboard">{popularTagGroups.map(({ tag, count, games, rankedGames }) => <Card className="section-card tag-game-card" key={tag} title={<Space size={8}><Tag color="blue">{tag}</Tag><Typography.Text type="secondary">{count}개 게임 · 플레이 많은 순</Typography.Text></Space>} extra={count > 5 ? <Button type="link" onClick={() => setTagGallery({ tag, games: rankedGames, sortLabel: "평점 높은 순 · 동점 시 플레이 횟수순" })}>더보기</Button> : null}><div className="tag-game-row">{games.map((game) => <article className="tag-game-item" key={game.id}><button className="tag-game-cover" type="button" onClick={() => viewGameDetail(game)}><Cover game={game} /></button><Typography.Text strong ellipsis>{game.title}</Typography.Text><Typography.Text type="secondary">플레이 {game.plays}회</Typography.Text><Space size={3}><Rate disabled allowHalf value={game.personalRating ?? 0} /><Typography.Text type="secondary">{game.personalRating?.toFixed(1) ?? "-"}</Typography.Text></Space>{game.photos.length > 0 && <><div className="photo-preview-grid">{game.photos.slice(0, 5).map((photo) => <button type="button" key={photo.id} onClick={() => viewGameDetail(game)}><img src={photo.url} alt={photo.caption || `${game.title} 플레이 사진`} /></button>)}</div>{game.photos.length > 5 && <Button type="link" size="small" onClick={() => setPhotoGalleryGame(game)}>더보기</Button>}</>}</article>)}</div></Card>)}</div> : <Card className="section-card" title="시작하기"><Typography.Paragraph type="secondary">관리자 로그인 후 첫 보드게임을 등록하면 태그별 게임 목록이 표시됩니다.</Typography.Paragraph></Card>}</div>
                  <div hidden={activeMenu !== "detail"}><Card className="section-card" title={viewingGame?.title ?? "게임 상세"}>{viewingGame ? <><div className="selected-game"><Cover game={viewingGame} /><div><Typography.Title level={4}>{viewingGame.title}</Typography.Title><Typography.Text type="secondary">{viewingGame.englishTitle} {viewingGame.year ? `(${viewingGame.year})` : ""}</Typography.Text><br /><Rate disabled allowHalf value={viewingGame.personalRating ?? 0} /><Typography.Text> {viewingGame.personalRating?.toFixed(1) ?? "평가 없음"}</Typography.Text></div></div><Space wrap>{viewingGame.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</Space><Typography.Paragraph>{viewingGame.review || "등록된 한줄 리뷰가 없습니다."}</Typography.Paragraph><Typography.Text type="secondary">{viewingGame.minPlayers}-{viewingGame.maxPlayers}명 · {viewingGame.minAge}세 이상 · {viewingGame.playTime ?? "시간 미입력"} · 플레이 {viewingGame.plays}회</Typography.Text>{viewingGame.videos.length > 0 && <section className="game-video-section"><Typography.Title level={5}><YoutubeOutlined /> 관련 YouTube 영상</Typography.Title><div className="game-video-grid">{viewingGame.videos.map((video) => <a key={video.id ?? video.youtubeId} href={video.url} target="_blank" rel="noreferrer"><img src={video.thumbnail} alt="" /><span><strong>{video.title}</strong><small>{video.channelName ?? "YouTube"}</small></span></a>)}</div></section>}<div className="play-photo-grid">{viewingGame.photos.map((photo) => <figure key={photo.id}><img src={photo.url} alt={photo.caption || `${viewingGame.title} 플레이 사진`} /><figcaption>{photo.caption || "플레이 기록"}</figcaption></figure>)}</div></> : <Empty description="게임을 찾지 못했습니다." />}</Card></div>
                  <div hidden={activeMenu !== "collection"}><Card id="collection" className="section-card collection-card" title="내 보유 게임" extra={<Typography.Text type="secondary">{isAdmin ? "게임을 클릭해 수정" : "게임을 클릭해 상세 보기"}</Typography.Text>}>
                    <div className="collection-toolbar"><Input.Search value={collectionQuery} onChange={(event) => setCollectionQuery(event.target.value)} allowClear placeholder="게임명, 영문명, 태그 검색" prefix={<SearchOutlined />} /><Typography.Text type="secondary">{filteredCollection.length}개 결과</Typography.Text></div>
                    <div className="game-grid">
                      {filteredCollection.map((game) => <button className="game-item editable" key={game.id} type="button" onClick={() => openGame(game)}><Cover game={game} /><div className="game-info"><Typography.Text strong ellipsis>{game.title}</Typography.Text><Typography.Text type="secondary" className="english" ellipsis>{game.englishTitle}</Typography.Text><Space size={4}><Rate disabled allowHalf value={game.personalRating} count={1} /><Typography.Text>{game.personalRating?.toFixed(1) ?? "-"}</Typography.Text></Space><div className="game-tags"><Tag color={game.status === "owned" ? "blue" : "default"}>{statusLabel[game.status]}</Tag>{game.tags.slice(0, 2).map((tag) => <Tag key={tag}>{tag}</Tag>)}</div><Typography.Text type="secondary">플레이 {game.plays}회</Typography.Text></div></button>)}
                    </div>
                    {!filteredCollection.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={collection.length ? "검색 결과가 없습니다." : "아직 등록한 보드게임이 없습니다."} />}
                  </Card></div>
                  <div hidden={activeMenu !== "tags"}><Card id="tags" className="section-card" title="내 태그" extra={<Typography.Text type="secondary">태그를 클릭해 게임 보기</Typography.Text>}><div className="tag-library">{collectionTags.map((tag) => <button className="tag-filter-button" key={tag} type="button" onClick={() => openTagGames(tag)}><Tag color="blue">{tag}</Tag></button>)}{!collectionTags.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="등록된 태그가 없습니다." />}</div></Card></div>
                  <div hidden={activeMenu !== "recommend"}><Card id="recommend" className="recommendation-card" title={`오늘의 추천 · ${people}명, ${age}세 이상`} extra={<Button type="link" onClick={() => setRecommendationOpen(true)}>자세히 보기</Button>}>
                    <div className="recommendation-controls"><span>참가 인원</span><InputNumber min={1} max={12} value={people} onChange={(value) => setPeople(value ?? 1)} /><span>최연소 연령</span><InputNumber min={0} max={99} value={age} onChange={(value) => setAge(value ?? 0)} /></div>
                    <div className="recommendation-list">{recommendations.slice(0, 3).map((game) => <div className="recommendation-item" key={game.id}><Cover game={game} size="small" /><div><Typography.Text strong>{game.title}</Typography.Text><Typography.Paragraph type="secondary">{game.bestPlayers === people ? `${people}명일 때 가장 좋아요` : `${game.minPlayers}-${game.maxPlayers}명 플레이 가능`} · {game.playTime ?? "시간 미입력"}</Typography.Paragraph></div></div>)}{!recommendations.length && <Empty description="조건에 맞는 게임이 없어요." image={Empty.PRESENTED_IMAGE_SIMPLE} />}</div>
                  </Card></div>
                </Col>}
                {activeMenu === "registration" && <Col xs={24} xl={24}>
                  {isAdmin ? <Card id="registration" className="registration-card" title={isEditingSelected ? "게임 수정" : "게임 등록"} extra={<Tag color="blue">Boardlife</Tag>}>
                    <Typography.Paragraph type="secondary">게임명을 검색해 후보를 고른 뒤, 자동으로 채워진 정보를 확인하세요.</Typography.Paragraph>
                    <Input value={query} prefix={<SearchOutlined />} placeholder="예: 스플랜더, Splendor" onChange={(event) => setQuery(event.target.value)} suffix={searching ? "검색 중" : null} />
                    {(candidates.length > 0 || searching) && <List className="search-results" loading={searching} dataSource={candidates} renderItem={(candidate) => <List.Item onClick={() => chooseCandidate(candidate)}><List.Item.Meta avatar={<Cover game={candidate} size="small" />} title={candidate.title} description={`${candidate.englishTitle || "영문명 없음"} · ${candidate.year ?? "연도 미상"}`} /></List.Item>} />}
                    {searchError && <Alert className="search-error" type="warning" showIcon message="Boardlife 검색을 완료하지 못했습니다." description={searchError} />}
                    <Divider />
                    {selected ? <Form form={form} layout="vertical" onFinish={saveGame} requiredMark={false}>
                      <div className="selected-game"><Cover game={selected} /><div><Typography.Title level={4}>{selected.title}</Typography.Title><Typography.Text type="secondary">{selected.englishTitle} {selected.year ? `(${selected.year})` : ""}</Typography.Text><br /><Typography.Link href={selected.sourceUrl} target="_blank">Boardlife 원본 보기</Typography.Link></div></div>
                      <Row gutter={10}><Col span={12}><Form.Item name="minPlayers" label="최소 인원"><InputNumber min={1} max={20} className="full-width" /></Form.Item></Col><Col span={12}><Form.Item name="maxPlayers" label="최대 인원"><InputNumber min={1} max={20} className="full-width" /></Form.Item></Col><Col span={12}><Form.Item name="bestPlayers" label="베스트 인원"><InputNumber min={1} max={20} className="full-width" /></Form.Item></Col><Col span={12}><Form.Item name="minAge" label="권장 연령"><InputNumber min={0} max={99} className="full-width" /></Form.Item></Col></Row>
                      <Row gutter={10}><Col span={12}><Form.Item name="playTime" label="플레이 시간"><Input placeholder="예: 30-45분" /></Form.Item></Col><Col span={12}><Form.Item name="complexity" label="난이도"><InputNumber min={0} max={5} step={0.1} className="full-width" /></Form.Item></Col></Row>
                      <Form.Item name="tags" label="태그"><Select mode="tags" placeholder="태그를 입력하세요" options={collectionTags.map((tag) => ({ value: tag }))} /></Form.Item>
                      <Form.Item name="status" label="보유 상태" initialValue="owned"><Radio.Group optionType="button" buttonStyle="solid"><Radio.Button value="owned">보유</Radio.Button><Radio.Button value="wishlist">위시리스트</Radio.Button><Radio.Button value="played">플레이 완료</Radio.Button></Radio.Group></Form.Item>
                      <Form.Item name="personalRating" label="나의 평점"><Rate allowHalf /></Form.Item>
                      <Form.Item name="review" label="한줄 리뷰"><Input.TextArea rows={2} placeholder="내가 느낀 재미와 추천 이유를 남겨보세요." /></Form.Item>
                      <Form.Item name="plays" label="플레이 횟수"><InputNumber min={0} className="full-width" /></Form.Item>
                      <Form.Item name="videos" hidden getValueProps={() => ({})}><span /></Form.Item>
                      <div className="video-section"><div className="video-section-heading"><div><Typography.Text strong><YoutubeOutlined /> 관련 YouTube 영상</Typography.Text><Typography.Text type="secondary">등록 시 상위 3개 영상이 자동으로 선택됩니다.</Typography.Text></div><Button size="small" loading={searchingVideos} onClick={() => selected && void searchRelatedVideos(selected, false)}>영상 다시 검색</Button></div>{videoSearchError && <Alert type="info" showIcon message={videoSearchError} />}{videoCandidates.length > 0 && <div className="video-candidate-grid">{videoCandidates.map((video) => { const isSelected = selectedVideos.some((item) => item.youtubeId === video.youtubeId); return <button className={`video-candidate ${isSelected ? "selected" : ""}`} key={video.youtubeId} type="button" onClick={() => toggleVideo(video)}><img src={video.thumbnail} alt="" /><span><strong>{video.title}</strong><small>{video.channelName}</small></span><Tag color={isSelected ? "blue" : "default"}>{isSelected ? "연결됨" : "선택"}</Tag></button>; })}</div>}{!searchingVideos && !videoSearchError && videoCandidates.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="검색된 YouTube 영상이 없습니다. 다른 영상 링크를 직접 추가할 수 있습니다." />}<Space.Compact className="manual-video-input"><Input value={manualVideoUrl} onChange={(event) => setManualVideoUrl(event.target.value)} placeholder="YouTube 영상 링크를 직접 추가" onPressEnter={addManualVideo} /><Button onClick={addManualVideo}>링크 추가</Button></Space.Compact>{selectedVideos.length > 0 && <div className="selected-video-list">{selectedVideos.map((video) => <Tag closable key={video.youtubeId} onClose={() => toggleVideo(video)}>{video.title}</Tag>)}</div>}</div>
                      {isEditingSelected && <div className="play-photo-section"><Typography.Text strong>플레이 사진</Typography.Text><Input value={photoCaption} onChange={(event) => setPhotoCaption(event.target.value)} placeholder="사진에 남길 한마디 (선택)" /><Upload.Dragger accept="image/jpeg,image/png,image/webp,image/gif" multiple={false} showUploadList={false} disabled={uploadingPhoto} beforeUpload={(file) => { void uploadPlayPhoto(file); return false; }}><p className="ant-upload-drag-icon"><InboxOutlined /></p><p className="ant-upload-text">사진을 여기로 끌어다 놓으세요</p><p className="ant-upload-hint">클릭해서 선택할 수도 있습니다. JPG, PNG, WebP, GIF 파일은 최대 10MB까지 지원합니다.</p></Upload.Dragger><div className="play-photo-grid">{(selected as CollectionGame).photos.map((photo) => <figure key={photo.id}><img src={photo.url} alt={photo.caption || `${selected.title} 플레이 사진`} /><figcaption>{photo.caption || "플레이 기록"}</figcaption><Button size="small" danger onClick={() => void deletePlayPhoto(photo.id)}>삭제</Button></figure>)}</div></div>}
                      <Space className="form-actions"><Button onClick={() => { setSelected(null); form.resetFields(); }}>취소</Button><Button type="primary" htmlType="submit" loading={loadingDetail || saving}>{isEditingSelected ? "수정 저장" : "컬렉션에 저장"}</Button></Space>
                    </Form> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={loadingDetail ? "게임 정보를 불러오는 중…" : "검색 결과에서 게임을 선택하세요."} />}
                  </Card> : <Card id="registration" className="registration-card" title="관리자 로그인" extra={<LockOutlined />}><Typography.Paragraph type="secondary">컬렉션은 누구나 볼 수 있지만, 등록과 수정은 관리자만 할 수 있습니다.</Typography.Paragraph><Input.Password value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} onPressEnter={() => void login()} placeholder="관리자 비밀번호" /><Button type="primary" block loading={loggingIn} onClick={() => void login()} style={{ marginTop: 12 }}>관리자 로그인</Button></Card>}
                </Col>}
              </Row>
            </Content>
          </Layout>
        </Layout>
        <Drawer className="mobile-navigation" title={<div className="brand drawer-brand">Board <span>Shelf</span></div>} placement="left" open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} styles={{ body: { padding: 12 } }}>
          <Menu mode="inline" selectedKeys={[activeMenu]} onClick={({ key }) => changePage(key)} items={[
            { key: "dashboard", icon: <DashboardOutlined />, label: "대시보드" },
            { key: "collection", icon: <BookOutlined />, label: "게임 목록" },
            { key: "tags", icon: <TagsOutlined />, label: "태그 관리" },
            { key: "recommend", icon: <TeamOutlined />, label: "모임 추천" },
          ]} />
          <div className="mobile-navigation-actions">{isAdmin ? <Button type="primary" block icon={<PlusOutlined />} onClick={() => changePage("registration")}>게임 추가</Button> : <Button type="primary" block icon={<LockOutlined />} onClick={() => changePage("registration")}>관리자 로그인</Button>}<Button block icon={<ShareAltOutlined />} onClick={() => void shareCollection()}>전체 컬렉션 공유</Button>{isAdmin && <Button block icon={<LogoutOutlined />} onClick={() => void logout()}>관리자 로그아웃</Button>}</div>
        </Drawer>
        <Modal title={`${people}명, ${age}세 이상 추천`} open={recommendationOpen} footer={null} onCancel={() => setRecommendationOpen(false)}>
          <List dataSource={recommendations} locale={{ emptyText: "조건에 맞는 게임이 없습니다." }} renderItem={(game) => <List.Item><List.Item.Meta avatar={<Cover game={game} size="small" />} title={game.title} description={`${game.minPlayers}-${game.maxPlayers}명 · ${game.minAge}세 이상 · ${game.playTime ?? "시간 미입력"}`} /><Tag color={game.bestPlayers === people ? "blue" : "default"}>{game.bestPlayers === people ? "베스트 인원" : "플레이 가능"}</Tag></List.Item>} />
        </Modal>
        <Modal title={photoGalleryGame ? `${photoGalleryGame.title} · 플레이 사진` : "플레이 사진"} open={Boolean(photoGalleryGame)} footer={null} onCancel={() => setPhotoGalleryGame(null)}><div className="photo-gallery-grid">{photoGalleryGame?.photos.map((photo) => <button type="button" key={photo.id} onClick={() => viewGameDetail(photoGalleryGame)}><img src={photo.url} alt={photo.caption || `${photoGalleryGame.title} 플레이 사진`} /><span>{photo.caption || "플레이 기록"}</span></button>)}</div></Modal>
        <Modal title={tagGallery ? `${tagGallery.tag} 게임` : "태그 게임"} open={Boolean(tagGallery)} footer={null} onCancel={() => setTagGallery(null)}><Typography.Paragraph type="secondary">{tagGallery?.sortLabel}</Typography.Paragraph><List dataSource={tagGallery?.games ?? []} renderItem={(game) => <List.Item className="tag-gallery-item" onClick={() => viewGameDetail(game)}><List.Item.Meta avatar={<Cover game={game} size="small" />} title={game.title} description={`평점 ${game.personalRating?.toFixed(1) ?? "-"} · 플레이 ${game.plays}회`} /></List.Item>} /></Modal>
      </App>
    </ConfigProvider>
  );
}
