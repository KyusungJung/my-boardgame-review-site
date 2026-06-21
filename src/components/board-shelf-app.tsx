"use client";

import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  ConfigProvider,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Layout,
  List,
  Menu,
  Modal,
  Rate,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
} from "antd";
import {
  BookOutlined,
  DashboardOutlined,
  LockOutlined,
  LogoutOutlined,
  PlusOutlined,
  SearchOutlined,
  ShareAltOutlined,
  StarFilled,
  TagsOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import type { BoardGameMetadata, BoardlifeSearchResult, CollectionGame } from "@/lib/types";

const { Header, Sider, Content } = Layout;
const seededCollection: CollectionGame[] = [
  { id: "3516", title: "스플렌더", englishTitle: "Splendor", year: 2014, sourceUrl: "https://boardlife.co.kr/game/3516", minPlayers: 2, maxPlayers: 4, bestPlayers: 3, minAge: 10, playTime: "30분", complexity: 1.8, boardlifeRating: 7.4, sourceFetchedAt: "", tags: ["세트 컬렉션", "엔진 빌딩", "입문"], personalRating: 4.5, plays: 15, status: "owned", createdAt: "2026-06-21" },
  { id: "azul", title: "아줄", englishTitle: "Azul", year: 2017, sourceUrl: "", minPlayers: 2, maxPlayers: 4, bestPlayers: 3, minAge: 8, playTime: "30-45분", complexity: 1.8, sourceFetchedAt: "", tags: ["추상 전략", "타일 배치", "가족"], personalRating: 4.5, plays: 10, status: "owned", createdAt: "2026-06-20" },
  { id: "ticket", title: "티켓 투 라이드", englishTitle: "Ticket to Ride", year: 2004, sourceUrl: "", minPlayers: 2, maxPlayers: 5, bestPlayers: 4, minAge: 8, playTime: "45-60분", complexity: 1.8, sourceFetchedAt: "", tags: ["가족", "루트 빌딩", "초보 환영"], personalRating: 4, plays: 13, status: "owned", createdAt: "2026-06-20" },
  { id: "wingspan", title: "윙스팬", englishTitle: "Wingspan", year: 2019, sourceUrl: "", minPlayers: 1, maxPlayers: 5, bestPlayers: 3, minAge: 10, playTime: "40-70분", complexity: 2.4, sourceFetchedAt: "", tags: ["엔진 빌딩", "새", "전략"], personalRating: 4.5, plays: 9, status: "owned", createdAt: "2026-06-19" },
  { id: "catan", title: "카탄", englishTitle: "Catan", year: 1995, sourceUrl: "", minPlayers: 3, maxPlayers: 4, bestPlayers: 4, minAge: 10, playTime: "60-90분", complexity: 2.3, sourceFetchedAt: "", tags: ["협상", "가족", "모임"], personalRating: 4, plays: 12, status: "owned", createdAt: "2026-06-18" },
];

function Cover({ game, size = "regular" }: { game: Pick<BoardlifeSearchResult, "title" | "image" | "thumbnail">; size?: "small" | "regular" }) {
  const imageUrl = game.image || game.thumbnail;
  return imageUrl ? <img className={`cover ${size}`} src={imageUrl} alt={`${game.title} 표지`} /> : <div className={`cover ${size} cover-fallback`} aria-label={`${game.title} 표지 없음`}>{game.title.slice(0, 2)}</div>;
}

export function BoardShelfApp() {
  const [collection, setCollection] = useState<CollectionGame[]>(seededCollection);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [candidates, setCandidates] = useState<BoardlifeSearchResult[]>([]);
  const [selected, setSelected] = useState<BoardGameMetadata | null>(null);
  const [searching, setSearching] = useState(false);
  const [loadingDetail, startDetailTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [people, setPeople] = useState(4);
  const [age, setAge] = useState(10);
  const [recommendationOpen, setRecommendationOpen] = useState(false);
  const [form] = Form.useForm<CollectionGame>();
  const [messageApi, messageContext] = message.useMessage();

  useEffect(() => {
    async function loadDashboardData() {
      const [gamesResponse, sessionResponse] = await Promise.all([fetch("/api/games"), fetch("/api/auth/session")]);
      if (gamesResponse.ok) setCollection(await gamesResponse.json() as CollectionGame[]);
      if (sessionResponse.ok) setIsAdmin((await sessionResponse.json() as { authenticated: boolean }).authenticated);
    }
    void loadDashboardData();
  }, []);

  useEffect(() => {
    if (deferredQuery.trim().length < 2) {
      setCandidates([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/boardlife/search?word=${encodeURIComponent(deferredQuery)}`, { signal: controller.signal });
        const result = await response.json() as BoardlifeSearchResult[];
        if (!response.ok) throw new Error("검색 실패");
        setCandidates(result);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setCandidates([]);
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
        form.setFieldsValue({ ...resolved, tags: [], personalRating: 0, review: "", plays: 0, status: "owned", createdAt: new Date().toISOString() });
      } catch {
        messageApi.error("상세 정보를 읽지 못했습니다. 직접 입력할 수 있습니다.");
        const fallback: BoardGameMetadata = { ...candidate, sourceUrl: `https://boardlife.co.kr/game/${candidate.id}`, sourceFetchedAt: new Date().toISOString() };
        setSelected(fallback);
        form.setFieldsValue({ ...fallback, tags: [], personalRating: 0, review: "", plays: 0, status: "owned", createdAt: new Date().toISOString() });
      }
    });
  }

  async function saveGame(values: CollectionGame) {
    if (!selected) return;
    const game: CollectionGame = { ...selected, ...values, id: selected.id, title: values.title || selected.title, sourceUrl: selected.sourceUrl, sourceFetchedAt: selected.sourceFetchedAt, createdAt: new Date().toISOString() };
    setSaving(true);
    try {
      const response = await fetch("/api/games", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(game) });
      const savedGame = await response.json() as CollectionGame | { message: string };
      if (!response.ok) throw new Error("message" in savedGame ? savedGame.message : "저장에 실패했습니다.");
      const persistedGame = savedGame as CollectionGame;
      setCollection((current) => [persistedGame, ...current.filter((item) => item.id !== persistedGame.id)]);
      messageApi.success(`${persistedGame.title}을(를) Neon DB에 저장했습니다.`);
      setSelected(null);
      setQuery("");
      form.resetFields();
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

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#1677ff", borderRadius: 8, fontFamily: "var(--font-sans)" } }}>
      <App>{messageContext}
        <Layout className="app-shell">
          <Sider width={236} breakpoint="lg" collapsedWidth={0} className="side-nav">
            <div className="brand">Board <span>Shelf</span></div>
            <Menu theme="dark" mode="inline" selectedKeys={["dashboard"]} items={[
              { key: "dashboard", icon: <DashboardOutlined />, label: "대시보드" },
              { key: "collection", icon: <BookOutlined />, label: "게임 목록" },
              { key: "tags", icon: <TagsOutlined />, label: "태그 관리" },
              { key: "recommend", icon: <TeamOutlined />, label: "모임 추천" },
            ]} />
            <div className="side-bottom">{isAdmin && <Button type="primary" block icon={<PlusOutlined />} onClick={() => document.getElementById("registration")?.scrollIntoView({ behavior: "smooth" })}>게임 추가</Button>}<Button type="text" block icon={<ShareAltOutlined />}>전체 컬렉션 공유</Button>{isAdmin && <Button type="text" block icon={<LogoutOutlined />} onClick={() => void logout()}>관리자 로그아웃</Button>}</div>
          </Sider>
          <Layout>
            <Header className="top-header"><div><Typography.Title level={2}>대시보드</Typography.Title><Typography.Text type="secondary">내 보드게임 컬렉션을 한눈에 관리하세요.</Typography.Text></div><Avatar style={{ background: "#e6f4ff", color: "#0958d9" }}>KJ</Avatar></Header>
            <Content className="content-area">
              <Row gutter={[20, 20]}>
                <Col xs={24} xl={15}>
                  <Card className="section-card" title="컬렉션 요약">
                    <Row gutter={[12, 12]}>
                      <Col xs={12} sm={6}><Statistic title="보유 게임" value={collection.length} suffix="개" /></Col>
                      <Col xs={12} sm={6}><Statistic title="총 플레이" value={collection.reduce((sum, game) => sum + game.plays, 0)} suffix="회" /></Col>
                      <Col xs={12} sm={6}><Statistic title="태그" value={collectionTags.length} suffix="개" /></Col>
                      <Col xs={12} sm={6}><Statistic title="평균 평점" value={collection.length ? collection.reduce((sum, game) => sum + (game.personalRating ?? 0), 0) / collection.length : 0} precision={1} prefix={<StarFilled className="star" />} suffix="/ 5" /></Col>
                    </Row>
                  </Card>
                  <Card className="section-card collection-card" title="내 보유 게임" extra={<Typography.Text type="secondary">최근 추가순</Typography.Text>}>
                    <div className="game-grid">
                      {collection.map((game) => <article className="game-item" key={game.id}><Cover game={game} /><div className="game-info"><Typography.Text strong ellipsis>{game.title}</Typography.Text><Typography.Text type="secondary" className="english" ellipsis>{game.englishTitle}</Typography.Text><Space size={4}><Rate disabled allowHalf value={game.personalRating} count={1} /><Typography.Text>{game.personalRating?.toFixed(1) ?? "-"}</Typography.Text></Space><div className="game-tags">{game.tags.slice(0, 2).map((tag) => <Tag key={tag}>{tag}</Tag>)}</div><Typography.Text type="secondary">플레이 {game.plays}회</Typography.Text></div></article>)}
                    </div>
                    <Divider orientation="left" plain>내 태그</Divider>
                    <div className="tag-library">{collectionTags.map((tag) => <Tag color="blue" key={tag}>{tag}</Tag>)}{!collectionTags.length && <Typography.Text type="secondary">등록된 태그가 없습니다.</Typography.Text>}</div>
                  </Card>
                  <Card className="recommendation-card" title={`오늘의 추천 · ${people}명, ${age}세 이상`} extra={<Button type="link" onClick={() => setRecommendationOpen(true)}>자세히 보기</Button>}>
                    <div className="recommendation-controls"><span>참가 인원</span><InputNumber min={1} max={12} value={people} onChange={(value) => setPeople(value ?? 1)} /><span>최연소 연령</span><InputNumber min={0} max={99} value={age} onChange={(value) => setAge(value ?? 0)} /></div>
                    <div className="recommendation-list">{recommendations.slice(0, 3).map((game) => <div className="recommendation-item" key={game.id}><Cover game={game} size="small" /><div><Typography.Text strong>{game.title}</Typography.Text><Typography.Paragraph type="secondary">{game.bestPlayers === people ? `${people}명일 때 가장 좋아요` : `${game.minPlayers}-${game.maxPlayers}명 플레이 가능`} · {game.playTime ?? "시간 미입력"}</Typography.Paragraph></div></div>)}{!recommendations.length && <Empty description="조건에 맞는 게임이 없어요." image={Empty.PRESENTED_IMAGE_SIMPLE} />}</div>
                  </Card>
                </Col>
                <Col xs={24} xl={9}>
                  {isAdmin ? <Card id="registration" className="registration-card" title="게임 등록" extra={<Tag color="blue">Boardlife</Tag>}>
                    <Typography.Paragraph type="secondary">게임명을 검색해 후보를 고른 뒤, 자동으로 채워진 정보를 확인하세요.</Typography.Paragraph>
                    <Input value={query} prefix={<SearchOutlined />} placeholder="예: 스플랜더, Splendor" onChange={(event) => setQuery(event.target.value)} suffix={searching ? "검색 중" : null} />
                    {(candidates.length > 0 || searching) && <List className="search-results" loading={searching} dataSource={candidates} renderItem={(candidate) => <List.Item onClick={() => chooseCandidate(candidate)}><List.Item.Meta avatar={<Cover game={candidate} size="small" />} title={candidate.title} description={`${candidate.englishTitle || "영문명 없음"} · ${candidate.year ?? "연도 미상"}`} /></List.Item>} />}
                    <Divider />
                    {selected ? <Form form={form} layout="vertical" onFinish={saveGame} requiredMark={false}>
                      <div className="selected-game"><Cover game={selected} /><div><Typography.Title level={4}>{selected.title}</Typography.Title><Typography.Text type="secondary">{selected.englishTitle} {selected.year ? `(${selected.year})` : ""}</Typography.Text><br /><Typography.Link href={selected.sourceUrl} target="_blank">Boardlife 원본 보기</Typography.Link></div></div>
                      <Row gutter={10}><Col span={12}><Form.Item name="minPlayers" label="최소 인원"><InputNumber min={1} max={20} className="full-width" /></Form.Item></Col><Col span={12}><Form.Item name="maxPlayers" label="최대 인원"><InputNumber min={1} max={20} className="full-width" /></Form.Item></Col><Col span={12}><Form.Item name="bestPlayers" label="베스트 인원"><InputNumber min={1} max={20} className="full-width" /></Form.Item></Col><Col span={12}><Form.Item name="minAge" label="권장 연령"><InputNumber min={0} max={99} className="full-width" /></Form.Item></Col></Row>
                      <Row gutter={10}><Col span={12}><Form.Item name="playTime" label="플레이 시간"><Input placeholder="예: 30-45분" /></Form.Item></Col><Col span={12}><Form.Item name="complexity" label="난이도"><InputNumber min={0} max={5} step={0.1} className="full-width" /></Form.Item></Col></Row>
                      <Form.Item name="tags" label="태그"><Select mode="tags" placeholder="태그를 입력하세요" options={collectionTags.map((tag) => ({ value: tag }))} /></Form.Item>
                      <Form.Item name="personalRating" label="나의 평점"><Rate allowHalf /></Form.Item>
                      <Form.Item name="review" label="한줄 리뷰"><Input.TextArea rows={2} placeholder="내가 느낀 재미와 추천 이유를 남겨보세요." /></Form.Item>
                      <Form.Item name="plays" label="플레이 횟수"><InputNumber min={0} className="full-width" /></Form.Item>
                      <Space className="form-actions"><Button onClick={() => { setSelected(null); form.resetFields(); }}>취소</Button><Button type="primary" htmlType="submit" loading={loadingDetail || saving}>컬렉션에 저장</Button></Space>
                    </Form> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={loadingDetail ? "게임 정보를 불러오는 중…" : "검색 결과에서 게임을 선택하세요."} />}
                  </Card> : <Card id="registration" className="registration-card" title="관리자 로그인" extra={<LockOutlined />}><Typography.Paragraph type="secondary">컬렉션은 누구나 볼 수 있지만, 등록과 수정은 관리자만 할 수 있습니다.</Typography.Paragraph><Input.Password value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} onPressEnter={() => void login()} placeholder="관리자 비밀번호" /><Button type="primary" block loading={loggingIn} onClick={() => void login()} style={{ marginTop: 12 }}>관리자 로그인</Button></Card>}
                </Col>
              </Row>
            </Content>
          </Layout>
        </Layout>
        <Modal title={`${people}명, ${age}세 이상 추천`} open={recommendationOpen} footer={null} onCancel={() => setRecommendationOpen(false)}>
          <List dataSource={recommendations} locale={{ emptyText: "조건에 맞는 게임이 없습니다." }} renderItem={(game) => <List.Item><List.Item.Meta avatar={<Cover game={game} size="small" />} title={game.title} description={`${game.minPlayers}-${game.maxPlayers}명 · ${game.minAge}세 이상 · ${game.playTime ?? "시간 미입력"}`} /><Tag color={game.bestPlayers === people ? "blue" : "default"}>{game.bestPlayers === people ? "베스트 인원" : "플레이 가능"}</Tag></List.Item>} />
        </Modal>
      </App>
    </ConfigProvider>
  );
}
