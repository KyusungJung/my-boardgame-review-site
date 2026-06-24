"use client";

import {
  Alert,
  App,
  Avatar,
  Button,
  Card,
  Checkbox,
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
  Steps,
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
  OrderedListOutlined,
  PlusOutlined,
  SearchOutlined,
  ShareAltOutlined,
  TagsOutlined,
  TeamOutlined,
  YoutubeOutlined,
} from "@ant-design/icons";
import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import type { BoardGameMetadata, BoardlifeSearchResult, CollectionGame, GamePlaylist, GameVideo } from "@/lib/types";

const { Header, Sider, Content } = Layout;
const pageMetadata = {
  dashboard: { title: "대시보드", description: "내 보드게임 컬렉션 현황을 한눈에 관리하세요." },
  collection: { title: "게임 목록", description: "등록한 보드게임과 플레이 기록을 확인하세요." },
  tags: { title: "태그 관리", description: "컬렉션을 분류하는 태그를 확인하고 관리하세요." },
  recommend: { title: "모임 추천", description: "참가 인원과 취향에 맞는 게임을 찾아보세요." },
  playlists: { title: "플레이리스트", description: "게임을 골라 순서를 정하고, 플레이 계획을 공유하세요." },
  registration: { title: "게임 추가", description: "Boardlife에서 게임을 찾아 컬렉션에 등록하세요." },
  detail: { title: "게임 상세", description: "보드게임 정보와 플레이 기록을 확인하세요." },
};

const statusLabel = { owned: "보유", wishlist: "위시리스트", played: "플레이 완료" } as const;
const strategyTags = ["전략게임", "자원 승점", "엔진 빌딩", "일꾼 놓기", "덱,백,풀 빌딩", "영역 건설"];
const partyTags = ["파티게임", "파티 게임", "운걸기", "주사위 굴림", "협력 게임", "어린이게임"];
const familyTags = ["가족게임", "가족 게임", "어린이게임", "어린이 게임"];
const mechanismOptions = [
  { value: "일꾼 놓기", tags: ["일꾼 놓기"] },
  { value: "오픈 드래프팅", tags: ["오픈 드래프팅", "드래프팅"] },
  { value: "운과 주사위", tags: ["운걸기", "주사위 굴림", "주사위"] },
  { value: "덱 빌딩", tags: ["덱,백,풀 빌딩"] },
  { value: "타일 놓기", tags: ["타일 놓기", "영역 건설"] },
  { value: "셋 컬렉션", tags: ["셋 컬렉션"] },
  { value: "협력 게임", tags: ["협력 게임"] },
  { value: "카드 게임", tags: ["카드 게임", "핸드 관리"] },
];
const PLAYLIST_SHARE_PREVIEW_VERSION = "3";

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
  const [familyGameOnly, setFamilyGameOnly] = useState(false);
  const [recommendationStep, setRecommendationStep] = useState(0);
  const [playStyle, setPlayStyle] = useState<"strategy" | "balanced" | "party">("balanced");
  const [preferredMechanisms, setPreferredMechanisms] = useState<string[]>([]);
  const [tagGallery, setTagGallery] = useState<{ tag: string; games: CollectionGame[]; sortLabel: string } | null>(null);
  const [loadingGameDescription, setLoadingGameDescription] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [photoCaption, setPhotoCaption] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoUploadQueue = useRef(Promise.resolve());
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [videoCandidates, setVideoCandidates] = useState<GameVideo[]>([]);
  const [searchingVideos, setSearchingVideos] = useState(false);
  const [videoSearchError, setVideoSearchError] = useState<string | null>(null);
  const [manualVideoUrl, setManualVideoUrl] = useState("");
  const [playlists, setPlaylists] = useState<GamePlaylist[]>([]);
  const [playlistTitle, setPlaylistTitle] = useState("");
  const [playlistDescription, setPlaylistDescription] = useState("");
  const [playlistQuery, setPlaylistQuery] = useState("");
  const [playlistGameIds, setPlaylistGameIds] = useState<string[]>([]);
  const [editingPlaylistShareId, setEditingPlaylistShareId] = useState<string | null>(null);
  const [savingPlaylist, setSavingPlaylist] = useState(false);
  const [draggingPlaylistGameId, setDraggingPlaylistGameId] = useState<string | null>(null);
  const [shareTargetPlaylist, setShareTargetPlaylist] = useState<GamePlaylist | null>(null);
  const [form] = Form.useForm<CollectionGame>();
  const selectedVideos = Form.useWatch("videos", form) ?? [];
  const [messageApi, messageContext] = message.useMessage();

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [gamesResponse, sessionResponse, playlistsResponse] = await Promise.all([fetch("/api/games"), fetch("/api/auth/session"), fetch("/api/playlists")]);
        const games = gamesResponse.ok ? await gamesResponse.json() as CollectionGame[] : [];
        const session = sessionResponse.ok ? await sessionResponse.json() as { authenticated: boolean } : { authenticated: false };
        const loadedPlaylists = playlistsResponse.ok ? await playlistsResponse.json() as GamePlaylist[] : [];
        setCollection(Array.isArray(games) ? games : []);
        setIsAdmin(session.authenticated);
        setPlaylists(Array.isArray(loadedPlaylists) ? loadedPlaylists : []);
      } catch {
        setCollection([]);
        setIsAdmin(false);
        setPlaylists([]);
      }
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

  const recommendationProfile = useMemo(() => ({
    strategy: collection.filter((game) => game.tags.some((tag) => strategyTags.includes(tag))).length,
    party: collection.filter((game) => game.tags.some((tag) => partyTags.includes(tag))).length,
  }), [collection]);
  const recommendations = useMemo(() => collection
    .filter((game) => (game.minPlayers ?? 1) <= people && (game.maxPlayers ?? 99) >= people && (!familyGameOnly || game.tags.some((tag) => familyTags.includes(tag))))
    .map((game) => {
      const hasStrategyTag = game.tags.some((tag) => strategyTags.includes(tag));
      const hasPartyTag = game.tags.some((tag) => partyTags.includes(tag));
      const hasFamilyTag = game.tags.some((tag) => familyTags.includes(tag));
      const matchedMechanisms = mechanismOptions.filter((option) => preferredMechanisms.includes(option.value) && option.tags.some((tag) => game.tags.includes(tag))).map((option) => option.value);
      let score = (game.bestPlayers === people ? 4 : 0) + (game.personalRating ?? 0) + Math.min(game.plays, 10) / 5 + matchedMechanisms.length * 3;
      if (playStyle === "strategy") score += hasStrategyTag ? 5 : 0;
      if (playStyle === "party") score += hasPartyTag ? 5 : 0;
      if (playStyle === "balanced") score += (hasStrategyTag ? 2 : 0) + (hasPartyTag ? 2 : 0);
      const reasons = [game.bestPlayers === people ? `${people}명 베스트` : `${game.minPlayers ?? 1}-${game.maxPlayers ?? "?"}명 가능`, ...(familyGameOnly && hasFamilyTag ? ["가족 게임"] : []), ...matchedMechanisms];
      if (!matchedMechanisms.length) reasons.push(playStyle === "strategy" && hasStrategyTag ? "전략형 성향" : playStyle === "party" && hasPartyTag ? "파티형 성향" : "균형 성향");
      return { game, score, reasons };
    })
    .toSorted((first, second) => second.score - first.score || (second.game.personalRating ?? 0) - (first.game.personalRating ?? 0) || second.game.plays - first.game.plays)
    .slice(0, 5), [collection, familyGameOnly, people, playStyle, preferredMechanisms]);

  const collectionTags = useMemo(() => [...new Set(collection.flatMap((game) => game.tags))].toSorted(), [collection]);
  const recentGames = useMemo(() => collection.toSorted((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()).slice(0, 5), [collection]);
  const filteredCollection = useMemo(() => {
    const normalizedQuery = collectionQuery.trim().toLocaleLowerCase("ko");
    if (!normalizedQuery) return collection;
    return collection.filter((game) => [game.title, game.englishTitle, ...game.tags].some((value) => value.toLocaleLowerCase("ko").includes(normalizedQuery)));
  }, [collection, collectionQuery]);
  const filteredPlaylistGames = useMemo(() => {
    const normalizedQuery = playlistQuery.trim().toLocaleLowerCase("ko");
    if (!normalizedQuery) return collection;
    return collection.filter((game) => [game.title, game.englishTitle, ...game.tags].some((value) => value.toLocaleLowerCase("ko").includes(normalizedQuery)));
  }, [collection, playlistQuery]);
  const selectedPlaylistGames = useMemo(() => playlistGameIds.flatMap((id) => {
    const game = collection.find((item) => item.id === id);
    return game ? [game] : [];
  }), [collection, playlistGameIds]);
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
    if (collection.some((game) => game.id === candidate.id)) {
      messageApi.info("이미 등록되어 있습니다.");
      return;
    }
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
    if (game.description) return;

    setLoadingGameDescription(true);
    void fetch(`/api/boardlife/game/${game.id}`)
      .then(async (response) => response.ok ? response.json() as Promise<BoardGameMetadata> : null)
      .then((metadata) => {
        if (metadata?.description) setViewingGame((current) => current?.id === game.id ? { ...current, description: metadata.description } : current);
      })
      .catch(() => undefined)
      .finally(() => setLoadingGameDescription(false));
  }

  function openTagGames(tag: string) {
    const games = collection.filter((game) => game.tags.includes(tag)).toSorted((first, second) => second.plays - first.plays || (second.personalRating ?? 0) - (first.personalRating ?? 0));
    setTagGallery({ tag, games, sortLabel: "플레이 횟수 많은 순" });
  }

  async function uploadPlayPhoto(file?: File) {
    if (!file || !selected || !isEditingSelected) return;
    const gameId = selected.id;
    setUploadingPhoto(true);
    try {
      if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) throw new Error("10MB 이하의 JPG, PNG, WebP, GIF 파일만 업로드할 수 있습니다.");
      const pathname = `game-photos/${gameId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
      const blob = await upload(pathname, file, { access: "public", handleUploadUrl: "/api/blob/upload" });
      const response = await fetch(`/api/games/${gameId}/photos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: blob.url, pathname: blob.pathname, caption: photoCaption }) });
      const photo = await response.json();
      if (!response.ok) throw new Error(photo.message ?? "사진을 업로드하지 못했습니다.");
      setSelected((current) => current?.id === gameId ? { ...(current as CollectionGame), photos: [photo, ...(current as CollectionGame).photos] } : current);
      setCollection((current) => current.map((game) => game.id === gameId ? { ...game, photos: [photo, ...game.photos] } : game));
      setPhotoCaption("");
      messageApi.success("플레이 사진을 추가했습니다.");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "사진을 업로드하지 못했습니다.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  function queuePlayPhotoUpload(file: File) {
    photoUploadQueue.current = photoUploadQueue.current
      .catch(() => undefined)
      .then(() => uploadPlayPhoto(file));
  }

  function queuePlayPhotoUploads(files: FileList | File[]) {
    Array.from(files).forEach((file) => queuePlayPhotoUpload(file));
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
      changePage(wasEditing ? "dashboard" : "registration");
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

  function startNewPlaylist() {
    setEditingPlaylistShareId(null);
    setPlaylistTitle("");
    setPlaylistDescription("");
    setPlaylistQuery("");
    setPlaylistGameIds([]);
    changePage("playlists");
  }

  function editPlaylist(playlist: GamePlaylist) {
    setEditingPlaylistShareId(playlist.shareId);
    setPlaylistTitle(playlist.title);
    setPlaylistDescription(playlist.description ?? "");
    setPlaylistQuery("");
    setPlaylistGameIds(playlist.games.map((game) => game.id));
    changePage("playlists");
  }

  function togglePlaylistGame(gameId: string) {
    setPlaylistGameIds((current) => current.includes(gameId) ? current.filter((id) => id !== gameId) : [...current, gameId]);
  }

  function movePlaylistGame(targetGameId: string) {
    if (!draggingPlaylistGameId || draggingPlaylistGameId === targetGameId) return;
    setPlaylistGameIds((current) => {
      const sourceIndex = current.indexOf(draggingPlaylistGameId);
      const targetIndex = current.indexOf(targetGameId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const reordered = [...current];
      reordered.splice(sourceIndex, 1);
      reordered.splice(targetIndex, 0, draggingPlaylistGameId);
      return reordered;
    });
    setDraggingPlaylistGameId(null);
  }

  async function savePlaylist() {
    const title = playlistTitle.trim();
    if (!title) {
      messageApi.error("플레이리스트 이름을 입력하세요.");
      return;
    }
    if (!playlistGameIds.length) {
      messageApi.error("게임을 하나 이상 선택하세요.");
      return;
    }
    setSavingPlaylist(true);
    try {
      const response = await fetch(editingPlaylistShareId ? `/api/playlists/${editingPlaylistShareId}` : "/api/playlists", {
        method: editingPlaylistShareId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: playlistDescription, gameIds: playlistGameIds }),
      });
      const result = await response.json() as GamePlaylist | { message?: string };
      if (!response.ok) throw new Error("message" in result ? result.message : "플레이리스트를 저장하지 못했습니다.");
      const savedPlaylist = result as GamePlaylist;
      setPlaylists((current) => [savedPlaylist, ...current.filter((playlist) => playlist.shareId !== savedPlaylist.shareId)]);
      messageApi.success(editingPlaylistShareId ? "플레이리스트를 수정했습니다." : "플레이리스트를 만들었습니다.");
      startNewPlaylist();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "플레이리스트를 저장하지 못했습니다.");
    } finally {
      setSavingPlaylist(false);
    }
  }

  async function deletePlaylist(shareId: string) {
    try {
      const response = await fetch(`/api/playlists/${shareId}`, { method: "DELETE" });
      if (!response.ok) throw new Error("플레이리스트를 삭제하지 못했습니다.");
      setPlaylists((current) => current.filter((playlist) => playlist.shareId !== shareId));
      if (editingPlaylistShareId === shareId) startNewPlaylist();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "플레이리스트를 삭제하지 못했습니다.");
    }
  }

  function openSharedPlaylist(shareId: string) {
    window.location.assign(`/playlists/${encodeURIComponent(shareId)}`);
  }

  function playlistShareUrl(shareId: string) {
    return `${window.location.origin}/playlists/${encodeURIComponent(shareId)}?preview=${PLAYLIST_SHARE_PREVIEW_VERSION}`;
  }

  async function copyShareUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      return;
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.append(textArea);
      textArea.select();
      const copied = document.execCommand("copy");
      textArea.remove();
      if (!copied) throw new Error("공유 주소를 복사하지 못했습니다.");
    }
  }

  async function copyPlaylistShareUrl(playlist: GamePlaylist) {
    const url = playlistShareUrl(playlist.shareId);
    try {
      await copyShareUrl(url);
      messageApi.success("소개 페이지 주소를 복사했습니다.");
    } catch (error) {
      messageApi.error("공유 주소를 복사하지 못했습니다.");
    }
  }

  async function sharePlaylistWithApps() {
    if (!shareTargetPlaylist) return;
    const playlist = shareTargetPlaylist;
    const url = playlistShareUrl(playlist.shareId);
    try {
      if (!navigator.share) {
        await copyPlaylistShareUrl(playlist);
        messageApi.info("이 기기에서는 앱 공유를 지원하지 않아 주소를 복사했습니다.");
        return;
      }
      await navigator.share({ title: playlist.title, url });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) messageApi.error("앱 공유를 완료하지 못했습니다.");
    } finally {
      setShareTargetPlaylist(null);
    }
  }

  function sharePlaylist(playlist: GamePlaylist) {
    const isMobileViewport = window.matchMedia("(max-width: 767px)").matches;
    const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobileDevice || isMobileViewport) {
      setShareTargetPlaylist(playlist);
      return;
    }
    void copyPlaylistShareUrl(playlist);
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
              { key: "playlists", icon: <OrderedListOutlined />, label: "플레이리스트" },
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
                  </Card><Card className="section-card recent-games-card" title="최근 등록" extra={<Typography.Text type="secondary">최근 추가한 5개 게임</Typography.Text>}>{recentGames.length ? <div className="recent-game-masonry">{recentGames.map((game) => <button type="button" key={game.id} onClick={() => viewGameDetail(game)}><Cover game={game} /><span><Typography.Text strong ellipsis>{game.title}</Typography.Text></span></button>)}</div> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="최근 등록한 게임이 없습니다." />}</Card>{popularTagGroups.length ? <div className="tag-dashboard">{popularTagGroups.map(({ tag, count, games, rankedGames }) => <Card className="section-card tag-game-card" key={tag} title={<Space size={8}><Tag color="blue">{tag}</Tag><Typography.Text type="secondary">{count}개 게임 · 플레이 많은 순</Typography.Text></Space>} extra={count > 5 ? <Button type="link" onClick={() => setTagGallery({ tag, games: rankedGames, sortLabel: "평점 높은 순 · 동점 시 플레이 횟수순" })}>더보기</Button> : null}><div className="tag-game-row">{games.map((game) => <article className="tag-game-item" key={game.id}><button className="tag-game-cover" type="button" onClick={() => viewGameDetail(game)}><Cover game={game} /></button><Typography.Text strong ellipsis>{game.title}</Typography.Text><Typography.Text type="secondary">플레이 {game.plays}회</Typography.Text><Space size={3}><Rate disabled allowHalf value={game.personalRating ?? 0} /><Typography.Text type="secondary">{game.personalRating?.toFixed(1) ?? "-"}</Typography.Text></Space></article>)}</div></Card>)}</div> : <Card className="section-card" title="시작하기"><Typography.Paragraph type="secondary">관리자 로그인 후 첫 보드게임을 등록하면 태그별 게임 목록이 표시됩니다.</Typography.Paragraph></Card>}</div>
                  <div hidden={activeMenu !== "detail"}><Card className="section-card" title={viewingGame?.title ?? "게임 상세"}>{viewingGame ? <><div className="selected-game"><Cover game={viewingGame} /><div><Typography.Title level={4}>{viewingGame.title}</Typography.Title><Typography.Text type="secondary">{viewingGame.englishTitle} {viewingGame.year ? `(${viewingGame.year})` : ""}</Typography.Text></div></div><Space wrap>{viewingGame.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</Space><section className="game-description"><Typography.Title level={5}>게임 설명</Typography.Title><Typography.Paragraph>{viewingGame.description || (loadingGameDescription ? "Boardlife에서 게임 설명을 불러오는 중입니다." : "등록된 게임 설명이 없습니다.")}</Typography.Paragraph></section><div className="personal-review-panel"><div className="personal-review-heading"><div><Typography.Text strong>개인 평가</Typography.Text><Typography.Text type="secondary">내가 남긴 평점과 플레이 기록</Typography.Text></div><div className="personal-rating"><Rate disabled allowHalf value={viewingGame.personalRating ?? 0} /><Typography.Text strong>{viewingGame.personalRating?.toFixed(1) ?? "평가 없음"}</Typography.Text></div></div><Typography.Paragraph>{viewingGame.review || "아직 작성한 한줄 리뷰가 없습니다."}</Typography.Paragraph><Typography.Text type="secondary">플레이 {viewingGame.plays}회</Typography.Text></div><div className="game-metadata"><Typography.Text type="secondary">{viewingGame.minPlayers}-{viewingGame.maxPlayers}명 · {viewingGame.minAge}세 이상 · {viewingGame.playTime ?? "시간 미입력"}</Typography.Text></div>{viewingGame.videos.length > 0 && <section className="game-video-section"><Typography.Title level={5}><YoutubeOutlined /> 관련 YouTube 영상</Typography.Title><div className="game-video-grid">{viewingGame.videos.map((video) => <a key={video.id ?? video.youtubeId} href={video.url} target="_blank" rel="noreferrer"><img src={video.thumbnail} alt="" /><span><strong>{video.title}</strong><small>{video.channelName ?? "YouTube"}</small></span></a>)}</div></section>}<div className="play-photo-grid">{viewingGame.photos.map((photo) => <figure key={photo.id}><img src={photo.url} alt={photo.caption || `${viewingGame.title} 플레이 사진`} /><figcaption>{photo.caption || "플레이 기록"}</figcaption></figure>)}</div></> : <Empty description="게임을 찾지 못했습니다." />}</Card></div>
                  <div hidden={activeMenu !== "collection"}><Card id="collection" className="section-card collection-card" title="내 보유 게임" extra={<Typography.Text type="secondary">{isAdmin ? "게임을 클릭해 수정" : "게임을 클릭해 상세 보기"}</Typography.Text>}>
                    <div className="collection-toolbar"><Input.Search value={collectionQuery} onChange={(event) => setCollectionQuery(event.target.value)} allowClear placeholder="게임명, 영문명, 태그 검색" prefix={<SearchOutlined />} /><Typography.Text type="secondary">{filteredCollection.length}개 결과</Typography.Text></div>
                    <div className="game-grid">
                      {filteredCollection.map((game) => <button className="game-item editable" key={game.id} type="button" onClick={() => openGame(game)}><Cover game={game} /><div className="game-info"><Typography.Text strong ellipsis>{game.title}</Typography.Text><Typography.Text type="secondary" className="english" ellipsis>{game.englishTitle}</Typography.Text><Space size={4}><Rate disabled allowHalf value={game.personalRating} count={1} /><Typography.Text>{game.personalRating?.toFixed(1) ?? "-"}</Typography.Text></Space><div className="game-tags"><Tag color={game.status === "owned" ? "blue" : "default"}>{statusLabel[game.status]}</Tag>{game.tags.slice(0, 2).map((tag) => <Tag key={tag}>{tag}</Tag>)}</div><Typography.Text type="secondary">플레이 {game.plays}회</Typography.Text></div></button>)}
                    </div>
                    {!filteredCollection.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={collection.length ? "검색 결과가 없습니다." : "아직 등록한 보드게임이 없습니다."} />}
                  </Card></div>
                  <div hidden={activeMenu !== "tags"}><Card id="tags" className="section-card" title="내 태그" extra={<Typography.Text type="secondary">태그를 클릭해 게임 보기</Typography.Text>}><div className="tag-library">{collectionTags.map((tag) => <button className="tag-filter-button" key={tag} type="button" onClick={() => openTagGames(tag)}><Tag color="blue">{tag}</Tag></button>)}{!collectionTags.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="등록된 태그가 없습니다." />}</div></Card></div>
                  <div hidden={activeMenu !== "recommend"}><Card id="recommend" className="recommendation-card" title="모임 추천"><Typography.Paragraph type="secondary">세 가지 질문에 답하면 컬렉션의 태그와 플레이 기록을 조합해 게임 5개를 골라드립니다.</Typography.Paragraph><Steps className="recommendation-steps" current={Math.min(recommendationStep, 2)} size="small" items={[{ title: "참가 인원" }, { title: "플레이 성향" }, { title: "게임 방식" }]} /><div className="recommendation-wizard" key={recommendationStep}>{recommendationStep === 0 && <section className="recommendation-slide"><Typography.Title level={4}>몇 명이 함께하나요?</Typography.Title><Typography.Paragraph type="secondary">플레이 가능한 인원과 가족 게임 여부를 기준으로 먼저 걸러냅니다.</Typography.Paragraph><div className="recommendation-number-fields"><label>참가 인원<InputNumber min={1} max={12} value={people} onChange={(value) => setPeople(value ?? 1)} addonAfter="명" /></label><label>가족 게임 여부<Radio.Group value={familyGameOnly ? "family" : "any"} onChange={(event) => setFamilyGameOnly(event.target.value === "family")}><Radio.Button value="family">가족 게임</Radio.Button><Radio.Button value="any">상관없음</Radio.Button></Radio.Group></label></div></section>}{recommendationStep === 1 && <section className="recommendation-slide"><Typography.Title level={4}>어떤 분위기를 좋아하나요?</Typography.Title><Typography.Paragraph type="secondary">컬렉션에는 전략형 태그 게임 {recommendationProfile.strategy}개, 파티형 태그 게임 {recommendationProfile.party}개가 있습니다.</Typography.Paragraph><Radio.Group className="play-style-options" value={playStyle} onChange={(event) => setPlayStyle(event.target.value)}><Radio.Button value="strategy"><strong>전략형</strong><span>생각할 거리와 선택의 재미</span></Radio.Button><Radio.Button value="balanced"><strong>균형</strong><span>전략과 가벼움의 적당한 조합</span></Radio.Button><Radio.Button value="party"><strong>파티형</strong><span>웃음과 즉흥적인 재미</span></Radio.Button></Radio.Group></section>}{recommendationStep === 2 && <section className="recommendation-slide"><Typography.Title level={4}>좋아하는 게임 방식을 골라주세요.</Typography.Title><Typography.Paragraph type="secondary">여러 개를 선택하면 해당 형식을 적절히 섞어 추천합니다. 선택하지 않아도 성향에 맞춰 추천합니다.</Typography.Paragraph><Checkbox.Group className="mechanism-options" value={preferredMechanisms} onChange={(values) => setPreferredMechanisms(values as string[])} options={mechanismOptions.map((option) => ({ label: option.value, value: option.value }))} /></section>}{recommendationStep === 3 && <section className="recommendation-slide recommendation-result"><Typography.Title level={4}>{people}명을 위한 추천 게임 5개</Typography.Title><Typography.Paragraph type="secondary">{familyGameOnly ? "가족 게임 · " : ""}{playStyle === "strategy" ? "전략 중심" : playStyle === "party" ? "파티 중심" : "균형 잡힌"} 성향{preferredMechanisms.length ? ` · ${preferredMechanisms.join(", ")}` : ""}을 반영했습니다.</Typography.Paragraph><div className="recommendation-list">{recommendations.map(({ game, reasons }) => <button className="recommendation-item" type="button" key={game.id} onClick={() => viewGameDetail(game)}><Cover game={game} size="small" /><span><Typography.Text strong>{game.title}</Typography.Text><Typography.Text type="secondary">{game.playTime ?? "시간 미입력"} · 플레이 {game.plays}회</Typography.Text><Space size={[3, 3]} wrap>{reasons.slice(0, 3).map((reason) => <Tag key={reason} color="blue">{reason}</Tag>)}</Space></span></button>)}</div>{!recommendations.length && <Empty description="조건에 맞는 게임이 없어요. 인원이나 가족 게임 조건을 조정해 보세요." image={Empty.PRESENTED_IMAGE_SIMPLE} />}</section>}</div><div className="recommendation-actions">{recommendationStep > 0 && <Button onClick={() => setRecommendationStep((step) => step - 1)}>이전</Button>}{recommendationStep < 3 ? <Button type="primary" onClick={() => setRecommendationStep((step) => step + 1)}>{recommendationStep === 2 ? "추천 게임 보기" : "다음"}</Button> : <Button onClick={() => setRecommendationStep(0)}>다시 추천하기</Button>}</div></Card></div>
                  <div hidden={activeMenu !== "playlists"}><Card className="section-card playlist-editor-card" title={editingPlaylistShareId ? "플레이리스트 수정" : "새 플레이리스트"} extra={isAdmin ? <Button type="link" onClick={startNewPlaylist}>새로 만들기</Button> : null}>{isAdmin ? <><div className="playlist-metadata"><Input value={playlistTitle} onChange={(event) => setPlaylistTitle(event.target.value)} placeholder="플레이리스트 이름" maxLength={80} /><Input.TextArea value={playlistDescription} onChange={(event) => setPlaylistDescription(event.target.value)} placeholder="이 리스트를 만든 이유를 짧게 적어주세요." rows={2} maxLength={300} /></div><div className="playlist-builder"><section><Typography.Text strong>게임 찾기</Typography.Text><Input.Search value={playlistQuery} onChange={(event) => setPlaylistQuery(event.target.value)} allowClear placeholder="게임명, 영문명, 태그 검색" prefix={<SearchOutlined />} /><div className="playlist-game-picker">{filteredPlaylistGames.map((game) => <label key={game.id}><Checkbox checked={playlistGameIds.includes(game.id)} onChange={() => togglePlaylistGame(game.id)} /><Cover game={game} size="small" /><span><Typography.Text strong ellipsis>{game.title}</Typography.Text><Typography.Text type="secondary">{game.tags.slice(0, 2).join(" · ") || "태그 없음"}</Typography.Text></span></label>)}</div></section><section><Typography.Text strong>플레이 순서 <Typography.Text type="secondary">({selectedPlaylistGames.length}개 · 드래그로 변경)</Typography.Text></Typography.Text><div className="playlist-order-list">{selectedPlaylistGames.map((game, index) => <article draggable key={game.id} className={draggingPlaylistGameId === game.id ? "dragging" : undefined} onDragStart={() => setDraggingPlaylistGameId(game.id)} onDragEnd={() => setDraggingPlaylistGameId(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => movePlaylistGame(game.id)}><span className="playlist-position">{index + 1}</span><Cover game={game} size="small" /><Typography.Text strong ellipsis>{game.title}</Typography.Text><Button type="text" danger size="small" onClick={() => togglePlaylistGame(game.id)}>제거</Button></article>)}{!selectedPlaylistGames.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="왼쪽에서 게임을 선택하세요." />}</div></section></div><div className="form-actions"><Button type="primary" loading={savingPlaylist} onClick={() => void savePlaylist()}>플레이리스트 저장</Button></div></> : <Empty description="플레이리스트 작성은 관리자만 할 수 있습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />}</Card><Card className="section-card" title="내 플레이리스트" extra={<Typography.Text type="secondary">8자리 소개 페이지 링크로 공유하세요</Typography.Text>}><div className="playlist-library">{playlists.map((playlist) => <article key={playlist.shareId} className="playlist-library-item" role="link" tabIndex={0} aria-label={`${playlist.title} 소개 페이지 열기`} onClick={() => openSharedPlaylist(playlist.shareId)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openSharedPlaylist(playlist.shareId); } }}><div><Typography.Title level={5}>{playlist.title}</Typography.Title><Typography.Paragraph type="secondary" ellipsis={{ rows: 2 }}>{playlist.description || "소개가 없습니다."}</Typography.Paragraph><Typography.Text type="secondary">게임 {playlist.games.length}개</Typography.Text></div><div className="playlist-library-games">{playlist.games.slice(0, 5).map((game) => <Cover game={game} size="small" key={game.id} />)}</div><Space wrap><Button size="small" onClick={(event) => { event.stopPropagation(); openSharedPlaylist(playlist.shareId); }}>소개 페이지 열기</Button><Button size="small" icon={<ShareAltOutlined />} onClick={(event) => { event.stopPropagation(); void sharePlaylist(playlist); }}>소개 페이지 공유</Button>{isAdmin && <Button size="small" onClick={(event) => { event.stopPropagation(); editPlaylist(playlist); }}>수정</Button>}{isAdmin && <Button size="small" danger onClick={(event) => { event.stopPropagation(); void deletePlaylist(playlist.shareId); }}>삭제</Button>}</Space></article>)}{!playlists.length && <Empty description="아직 만든 플레이리스트가 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />}</div></Card></div>
                </Col>}
                {activeMenu === "registration" && <Col xs={24} xl={24}>
                  {isAdmin ? <Card id="registration" className="registration-card" title={isEditingSelected ? "게임 수정" : "게임 등록"} extra={<Tag color="blue">Boardlife</Tag>}>
                    <Typography.Paragraph type="secondary">게임명을 검색해 후보를 고른 뒤, 자동으로 채워진 정보를 확인하세요.</Typography.Paragraph>
                    <Input value={query} prefix={<SearchOutlined />} placeholder="예: 스플랜더, Splendor" onChange={(event) => setQuery(event.target.value)} suffix={searching ? "검색 중" : null} />
                    {(candidates.length > 0 || searching) && <List className="search-results" loading={searching} dataSource={candidates} renderItem={(candidate) => { const isRegistered = collection.some((game) => game.id === candidate.id); return <List.Item className={isRegistered ? "already-registered" : undefined} onClick={isRegistered ? undefined : () => chooseCandidate(candidate)}><List.Item.Meta avatar={<Cover game={candidate} size="small" />} title={<Space size={6}><span>{candidate.title}</span>{isRegistered && <Tag color="default">이미 등록되어 있습니다</Tag>}</Space>} description={`${candidate.englishTitle || "영문명 없음"} · ${candidate.year ?? "연도 미상"}`} /></List.Item>; }} />}
                    {searchError && <Alert className="search-error" type="warning" showIcon message="Boardlife 검색을 완료하지 못했습니다." description={searchError} />}
                    <Divider />
                    {selected ? <Form form={form} layout="vertical" onFinish={saveGame} requiredMark={false}>
                      <div className="selected-game"><Cover game={selected} /><div><Typography.Title level={4}>{selected.title}</Typography.Title><Typography.Text type="secondary">{selected.englishTitle} {selected.year ? `(${selected.year})` : ""}</Typography.Text><br /><Typography.Link href={selected.sourceUrl} target="_blank">Boardlife 원본 보기</Typography.Link></div></div>
                      <Row gutter={10}><Col span={12}><Form.Item name="minPlayers" label="최소 인원"><InputNumber min={1} max={20} className="full-width" /></Form.Item></Col><Col span={12}><Form.Item name="maxPlayers" label="최대 인원"><InputNumber min={1} max={20} className="full-width" /></Form.Item></Col><Col span={12}><Form.Item name="bestPlayers" label="베스트 인원"><InputNumber min={1} max={20} className="full-width" /></Form.Item></Col><Col span={12}><Form.Item name="minAge" label="권장 연령"><InputNumber min={0} max={99} className="full-width" /></Form.Item></Col></Row>
                      <Row gutter={10}><Col span={12}><Form.Item name="playTime" label="플레이 시간"><Input placeholder="예: 30-45분" /></Form.Item></Col><Col span={12}><Form.Item name="complexity" label="난이도"><InputNumber min={0} max={5} step={0.1} className="full-width" /></Form.Item></Col></Row>
                      <Form.Item name="tags" label="태그"><Select mode="tags" placeholder="태그를 입력하세요" options={collectionTags.map((tag) => ({ value: tag }))} /></Form.Item>
                      <Form.Item name="status" label="보유 상태" initialValue="owned"><Radio.Group optionType="button" buttonStyle="solid"><Radio.Button value="owned">보유</Radio.Button><Radio.Button value="wishlist">위시리스트</Radio.Button><Radio.Button value="played">플레이 완료</Radio.Button></Radio.Group></Form.Item>
                      <section className="personal-review-form"><div className="personal-review-form-heading"><Typography.Text strong>개인 기록</Typography.Text><Typography.Text type="secondary">공개 메타데이터와 별도로 내 평가를 남겨보세요.</Typography.Text></div><Form.Item name="personalRating" label="나의 평점"><Rate allowHalf /></Form.Item><Form.Item name="review" label="한줄 리뷰"><Input.TextArea rows={2} placeholder="내가 느낀 재미와 추천 이유를 남겨보세요." /></Form.Item><Form.Item name="plays" label="플레이 횟수"><InputNumber min={0} className="full-width" /></Form.Item></section>
                      <Form.Item name="videos" hidden getValueProps={() => ({})}><span /></Form.Item>
                      <div className="video-section"><div className="video-section-heading"><div><Typography.Text strong><YoutubeOutlined /> 관련 YouTube 영상</Typography.Text><Typography.Text type="secondary">등록 시 상위 3개 영상이 자동으로 선택됩니다.</Typography.Text></div><Button size="small" loading={searchingVideos} onClick={() => selected && void searchRelatedVideos(selected, false)}>영상 다시 검색</Button></div>{videoSearchError && <Alert type="info" showIcon message={videoSearchError} />}{videoCandidates.length > 0 && <div className="video-candidate-grid">{videoCandidates.map((video) => { const isSelected = selectedVideos.some((item) => item.youtubeId === video.youtubeId); return <button className={`video-candidate ${isSelected ? "selected" : ""}`} key={video.youtubeId} type="button" onClick={() => toggleVideo(video)}><img src={video.thumbnail} alt="" /><span><strong>{video.title}</strong><small>{video.channelName}</small></span><Tag color={isSelected ? "blue" : "default"}>{isSelected ? "연결됨" : "선택"}</Tag></button>; })}</div>}{!searchingVideos && !videoSearchError && videoCandidates.length === 0 && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="검색된 YouTube 영상이 없습니다. 다른 영상 링크를 직접 추가할 수 있습니다." />}<Space.Compact className="manual-video-input"><Input value={manualVideoUrl} onChange={(event) => setManualVideoUrl(event.target.value)} placeholder="YouTube 영상 링크를 직접 추가" onPressEnter={addManualVideo} /><Button onClick={addManualVideo}>링크 추가</Button></Space.Compact>{selectedVideos.length > 0 && <div className="selected-video-list">{selectedVideos.map((video) => <Tag closable key={video.youtubeId} onClose={() => toggleVideo(video)}>{video.title}</Tag>)}</div>}</div>
                      {isEditingSelected && <div className="play-photo-section"><Typography.Text strong>플레이 사진</Typography.Text><Input value={photoCaption} onChange={(event) => setPhotoCaption(event.target.value)} placeholder="사진에 남길 한마디 (선택)" /><input ref={photoInputRef} className="photo-file-input" type="file" accept="image/*" multiple onChange={(event) => { if (event.currentTarget.files) queuePlayPhotoUploads(event.currentTarget.files); event.currentTarget.value = ""; }} /><Button onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}>사진 여러 장 선택</Button><Upload.Dragger accept="image/*" multiple={true} openFileDialogOnClick={false} showUploadList={false} disabled={uploadingPhoto} beforeUpload={(file) => { queuePlayPhotoUpload(file); return false; }}><p className="ant-upload-drag-icon"><InboxOutlined /></p><p className="ant-upload-text">사진을 여러 장 끌어다 놓으세요</p><p className="ant-upload-hint">iOS에서는 ‘사진 여러 장 선택’을 누른 뒤 사진 보관함에서 여러 장을 고르세요. 사진은 순서대로 저장되며 각 파일은 최대 10MB까지 지원합니다.</p></Upload.Dragger><div className="play-photo-grid">{(selected as CollectionGame).photos.map((photo) => <figure key={photo.id}><img src={photo.url} alt={photo.caption || `${selected.title} 플레이 사진`} /><figcaption>{photo.caption || "플레이 기록"}</figcaption><Button size="small" danger onClick={() => void deletePlayPhoto(photo.id)}>삭제</Button></figure>)}</div></div>}
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
            { key: "playlists", icon: <OrderedListOutlined />, label: "플레이리스트" },
          ]} />
          <div className="mobile-navigation-actions">{isAdmin ? <Button type="primary" block icon={<PlusOutlined />} onClick={() => changePage("registration")}>게임 추가</Button> : <Button type="primary" block icon={<LockOutlined />} onClick={() => changePage("registration")}>관리자 로그인</Button>}<Button block icon={<ShareAltOutlined />} onClick={() => void shareCollection()}>전체 컬렉션 공유</Button>{isAdmin && <Button block icon={<LogoutOutlined />} onClick={() => void logout()}>관리자 로그아웃</Button>}</div>
        </Drawer>
        <Modal title={tagGallery ? `${tagGallery.tag} 게임` : "태그 게임"} open={Boolean(tagGallery)} footer={null} onCancel={() => setTagGallery(null)}><Typography.Paragraph type="secondary">{tagGallery?.sortLabel}</Typography.Paragraph><List dataSource={tagGallery?.games ?? []} renderItem={(game) => <List.Item className="tag-gallery-item" onClick={() => viewGameDetail(game)}><List.Item.Meta avatar={<Cover game={game} size="small" />} title={game.title} description={`평점 ${game.personalRating?.toFixed(1) ?? "-"} · 플레이 ${game.plays}회`} /></List.Item>} /></Modal>
        <Modal title="플레이리스트 공유" open={Boolean(shareTargetPlaylist)} footer={null} onCancel={() => setShareTargetPlaylist(null)}><Typography.Paragraph type="secondary">카카오톡이 설치된 모바일 기기에서는 앱 공유를 누른 뒤 카카오톡을 선택할 수 있습니다.</Typography.Paragraph><Space direction="vertical" size={10} style={{ display: "flex" }}><Button block type="primary" onClick={() => void sharePlaylistWithApps()}>카카오톡 등 앱으로 공유</Button><Button block onClick={() => { if (shareTargetPlaylist) void copyPlaylistShareUrl(shareTargetPlaylist); setShareTargetPlaylist(null); }}>공유 주소 복사</Button></Space></Modal>
      </App>
    </ConfigProvider>
  );
}
