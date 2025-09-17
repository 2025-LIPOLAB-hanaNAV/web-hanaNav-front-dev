import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Icon } from './ui/Icon';
import { HanaNaviLogo } from './ui/HanaNaviLogo';
import { cn } from './ui/utils';
import { createDataset, listDatasets, deleteDatasets, type Dataset, uploadDocuments, listDocuments, type DocumentItem, parseDocuments, stopParsing, listChunks, type ChunkItem, addChunk, deleteChunks, updateChunk, retrieveChunks } from '../services/ragflow';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

export function KnowledgeBase() {
  // Dataset state
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [dsLoading, setDsLoading] = useState(false);
  const [dsError, setDsError] = useState<string | null>(null);
  const [newDsName, setNewDsName] = useState('');
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);

  // Document state
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const uploadRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastUploaded, setLastUploaded] = useState<string[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  // Chunks state
  const [chunks, setChunks] = useState<ChunkItem[]>([]);
  const [chunksLoading, setChunksLoading] = useState(false);
  const [chunksError, setChunksError] = useState<string | null>(null);
  const [chunkKeywords, setChunkKeywords] = useState('');
  const [selectedChunkIds, setSelectedChunkIds] = useState<string[]>([]);
  const [isAddChunkOpen, setIsAddChunkOpen] = useState(false);
  const [newChunkContent, setNewChunkContent] = useState('');
  const [newChunkKeywords, setNewChunkKeywords] = useState('');
  const [retrieveQ, setRetrieveQ] = useState('');
  const [retrieveLoading, setRetrieveLoading] = useState(false);
  const [retrieveCount, setRetrieveCount] = useState<number | null>(null);

  const loadDatasets = async () => {
    setDsLoading(true);
    setDsError(null);
    try {
      const items = await listDatasets({ page: 1, page_size: 100, orderby: 'update_time', desc: true });
      setDatasets(items);
      if (!selectedDatasetId && items.length > 0) {
        setSelectedDatasetId(items[0].id);
      }
    } catch (err: any) {
      setDsError(err?.message || '지식베이스 목록을 불러오지 못했습니다.');
    } finally {
      setDsLoading(false);
    }
  };

  const loadDocuments = async (datasetId: string) => {
    if (!datasetId) return;
    setDocsLoading(true);
    setDocsError(null);
    try {
      const data = await listDocuments(datasetId, { page: 1, page_size: 100, orderby: 'update_time', desc: true });
      setDocs(data.docs || []);
    } catch (err: any) {
      setDocsError(err?.message || '문서 목록을 불러오지 못했습니다.');
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  useEffect(() => {
    if (selectedDatasetId) loadDocuments(selectedDatasetId);
  }, [selectedDatasetId]);

  useEffect(() => {
    if (selectedDatasetId && selectedDocId) void loadChunks();
  }, [selectedDatasetId, selectedDocId]);

  const handleCreateDataset = async () => {
    const name = newDsName.trim();
    if (!name) return;
    setBusy(true);
    setDsError(null);
    try {
      const ds = await createDataset({ name });
      setNewDsName('');
      await loadDatasets();
      setSelectedDatasetId(ds.id);
    } catch (err: any) {
      setDsError(err?.message || '데이터셋 생성 실패');
    } finally {
      setBusy(false);
    }
  };

  const onChooseFiles = () => {
    if (!selectedDatasetId) {
      setDocsError('데이터셋을 먼저 선택하세요.');
      return;
    }
    uploadRef.current?.click();
  };

  const onFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !selectedDatasetId) return;
    setBusy(true);
    setDocsError(null);
    try {
      const uploaded = await uploadDocuments(selectedDatasetId, files);
      const ids = uploaded.map(u => u.id);
      setLastUploaded(ids);
      await loadDocuments(selectedDatasetId);
    } catch (err: any) {
      setDocsError(err?.message || '업로드 실패');
    } finally {
      setBusy(false);
      if (e.target) e.target.value = '';
    }
  };

  const startParsing = async () => {
    if (!selectedDatasetId || lastUploaded.length === 0) return;
    setBusy(true);
    try {
      await parseDocuments(selectedDatasetId, lastUploaded);
    } catch (err) {
      setDocsError('파싱 시작 실패');
    } finally {
      setBusy(false);
    }
  };

  const stopParsingAll = async () => {
    if (!selectedDatasetId || lastUploaded.length === 0) return;
    setBusy(true);
    try {
      await stopParsing(selectedDatasetId, lastUploaded);
    } catch (err) {
      setDocsError('파싱 중지 실패');
    } finally {
      setBusy(false);
    }
  };

  const loadChunks = async () => {
    if (!selectedDatasetId || !selectedDocId) return;
    setChunksLoading(true);
    setChunksError(null);
    try {
      const res = await listChunks(selectedDatasetId, selectedDocId, { keywords: chunkKeywords || undefined, page: 1, page_size: 200 });
      setChunks(res.chunks || []);
      setSelectedChunkIds([]);
    } catch (err: any) {
      setChunksError(err?.message || '청크 목록을 불러오지 못했습니다.');
    } finally {
      setChunksLoading(false);
    }
  };

  const handleAddChunk = async () => {
    if (!selectedDatasetId || !selectedDocId) return;
    const content = newChunkContent.trim();
    if (!content) return;
    setBusy(true);
    try {
      const keywords = newChunkKeywords.split(',').map(s => s.trim()).filter(Boolean);
      await addChunk(selectedDatasetId, selectedDocId, { content, important_keywords: keywords.length ? keywords : undefined });
      setNewChunkContent('');
      setNewChunkKeywords('');
      setIsAddChunkOpen(false);
      await loadChunks();
    } catch (err) {
      setChunksError('청크 추가 실패');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteChunks = async () => {
    if (!selectedDatasetId || !selectedDocId || selectedChunkIds.length === 0) return;
    setBusy(true);
    try {
      await deleteChunks(selectedDatasetId, selectedDocId, selectedChunkIds);
      await loadChunks();
    } catch (err) {
      setChunksError('청크 삭제 실패');
    } finally {
      setBusy(false);
    }
  };

  const handleRetrieve = async () => {
    const q = retrieveQ.trim();
    if (!q || !selectedDatasetId) return;
    setRetrieveLoading(true);
    setRetrieveCount(null);
    try {
      const res = await retrieveChunks({ question: q, dataset_ids: [selectedDatasetId], document_ids: selectedDocId ? [selectedDocId] : undefined, page: 1, page_size: 10, highlight: true });
      setRetrieveCount(res.total);
    } catch (err) {
      setChunksError('청크 검색 실패');
    } finally {
      setRetrieveLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col font-sans">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HanaNaviLogo size={40} className="opacity-80" />
            <div>
              <h1 className="text-2xl font-medium">지식베이스</h1>
              <p className="text-muted-foreground mt-1">문서/벡터DB/데이터셋 관리</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Tabs defaultValue="documents" className="h-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="documents">문서</TabsTrigger>
            <TabsTrigger value="vectors">벡터DB</TabsTrigger>
            <TabsTrigger value="datasets">데이터셋</TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Card className="p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">데이터셋</span>
                  <Select value={selectedDatasetId} onValueChange={setSelectedDatasetId}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder={dsLoading ? '불러오는 중...' : '데이터셋 선택'} />
                    </SelectTrigger>
                    <SelectContent>
                      {datasets.map(ds => (
                        <SelectItem key={ds.id} value={ds.id}>{ds.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <input ref={uploadRef} type="file" multiple className="hidden" onChange={onFilesSelected}
                  accept=".pdf,.txt,.md,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*" />
                <Button variant="outline" size="sm" onClick={onChooseFiles} disabled={!selectedDatasetId || busy}>
                  <Icon name="upload" size={16} /> 문서 업로드
                </Button>
                <Button variant="outline" size="sm" onClick={startParsing} disabled={lastUploaded.length === 0 || busy}>
                  <Icon name="arrow-right" size={16} /> 파싱 시작
                </Button>
                <Button variant="outline" size="sm" onClick={stopParsingAll} disabled={lastUploaded.length === 0 || busy}>
                  <Icon name="alert-triangle" size={16} /> 파싱 중지
                </Button>
                <Button variant="outline" size="sm" onClick={() => loadDocuments(selectedDatasetId)} disabled={!selectedDatasetId || docsLoading}>
                  새로고침
                </Button>
              </div>

              {docsError && (
                <div className="text-sm text-destructive">{docsError}</div>
              )}

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>크기</TableHead>
                      <TableHead className="text-right">업데이트</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docsLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-muted-foreground">불러오는 중...</TableCell></TableRow>
                    ) : docs.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-muted-foreground">문서가 없습니다.</TableCell></TableRow>
                    ) : (
                      docs.map(d => (
                        <TableRow key={d.id}>
                          <TableCell className="max-w-[360px] truncate">{d.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {String(d.run ?? d.status ?? '')}{d.progress != null ? ` • ${Math.round((d.progress as number) * 100) / 100}%` : ''}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{d.size ? `${d.size}B` : '-'}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">{d.update_time ? new Date(d.update_time).toLocaleString() : ''}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* Vectors Tab */}
          <TabsContent value="vectors" className="space-y-4">
            <Card className="p-4 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">데이터셋</span>
                  <Select value={selectedDatasetId} onValueChange={(v) => setSelectedDatasetId(v)}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder={dsLoading ? '불러오는 중...' : '데이터셋 선택'} />
                    </SelectTrigger>
                    <SelectContent>
                      {datasets.map(ds => (
                        <SelectItem key={ds.id} value={ds.id}>{ds.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">문서</span>
                  <Select value={selectedDocId} onValueChange={(v) => setSelectedDocId(v)}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder={docsLoading ? '불러오는 중...' : '문서 선택(선택사항)'} />
                    </SelectTrigger>
                    <SelectContent>
                      {docs.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Input placeholder="키워드 검색" className="w-60" value={chunkKeywords} onChange={(e) => setChunkKeywords(e.target.value)} />
                <Button variant="outline" size="sm" onClick={loadChunks} disabled={!selectedDatasetId || !selectedDocId || chunksLoading}>검색/새로고침</Button>

                <Dialog open={isAddChunkOpen} onOpenChange={setIsAddChunkOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" disabled={!selectedDatasetId || !selectedDocId}>청크 추가</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl">
                    <DialogHeader>
                      <DialogTitle>청크 추가</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <Textarea rows={6} placeholder="청크 내용" value={newChunkContent} onChange={(e) => setNewChunkContent(e.target.value)} />
                      <Input placeholder="키워드(쉼표로 구분)" value={newChunkKeywords} onChange={(e) => setNewChunkKeywords(e.target.value)} />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsAddChunkOpen(false)}>취소</Button>
                        <Button onClick={handleAddChunk} disabled={!newChunkContent.trim() || busy}>추가</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button variant="destructive" size="sm" onClick={handleDeleteChunks} disabled={selectedChunkIds.length === 0 || busy}>선택 삭제</Button>
              </div>

              {chunksError && (<div className="text-sm text-destructive">{chunksError}</div>)}

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>내용</TableHead>
                      <TableHead className="w-48">청크 ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chunksLoading ? (
                      <TableRow><TableCell colSpan={3} className="text-muted-foreground">불러오는 중...</TableCell></TableRow>
                    ) : chunks.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-muted-foreground">청크가 없습니다.</TableCell></TableRow>
                    ) : (
                      chunks.map(ch => {
                        const checked = selectedChunkIds.includes(ch.id);
                        return (
                          <TableRow key={ch.id}>
                            <TableCell className="align-top">
                              <Checkbox checked={checked} onCheckedChange={() => setSelectedChunkIds(prev => checked ? prev.filter(id => id !== ch.id) : [...prev, ch.id])} />
                            </TableCell>
                            <TableCell className="max-w-[520px] whitespace-pre-wrap break-words">{ch.content}</TableCell>
                            <TableCell className="text-xs text-muted-foreground align-top">{ch.id}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="search" size={16} />
                  <span className="font-medium">Retrieve 테스트</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input className="flex-1" placeholder="질문을 입력하세요" value={retrieveQ} onChange={(e) => setRetrieveQ(e.target.value)} />
                  <Button variant="outline" size="sm" onClick={handleRetrieve} disabled={retrieveLoading || !retrieveQ.trim()}>검색</Button>
                  {retrieveCount != null && (
                    <Badge variant="secondary">총 {retrieveCount}건</Badge>
                  )}
                </div>
              </Card>
            </Card>
          </TabsContent>

          {/* Datasets Tab */}
          <TabsContent value="datasets" className="space-y-4">
            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon name="book-open" size={16} />
                  <span className="font-medium">데이터셋</span>
                  <Badge variant="secondary">{datasets.length}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="새 데이터셋 이름"
                    value={newDsName}
                    onChange={(e) => setNewDsName(e.target.value)}
                    className="w-64"
                  />
                  <Button onClick={handleCreateDataset} disabled={!newDsName.trim() || busy}>생성</Button>
                  <Button variant="outline" onClick={loadDatasets} disabled={dsLoading}>새로고침</Button>
                  <Button variant="destructive" onClick={async () => {
                    if (selectedDatasetIds.length === 0) return;
                    setBusy(true);
                    try {
                      await deleteDatasets(selectedDatasetIds);
                      setSelectedDatasetIds([]);
                      if (selectedDatasetId && selectedDatasetIds.includes(selectedDatasetId)) setSelectedDatasetId('');
                      await loadDatasets();
                    } catch (err) {
                      setDsError('데이터셋 삭제 실패');
                    } finally {
                      setBusy(false);
                    }
                  }} disabled={selectedDatasetIds.length === 0 || busy}>선택 삭제</Button>
                </div>
              </div>

              {dsError && (
                <div className="text-sm text-destructive">{dsError}</div>
              )}

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>임베딩</TableHead>
                      <TableHead className="text-right">업데이트</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dsLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-muted-foreground">불러오는 중...</TableCell></TableRow>
                    ) : datasets.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-muted-foreground">데이터셋이 없습니다.</TableCell></TableRow>
                    ) : (
                      datasets.map(ds => (
                        <TableRow key={ds.id}>
                          <TableCell className="align-top">
                            <Checkbox
                              checked={selectedDatasetIds.includes(ds.id)}
                              onCheckedChange={() => setSelectedDatasetIds(prev => prev.includes(ds.id) ? prev.filter(id => id !== ds.id) : [...prev, ds.id])}
                            />
                          </TableCell>
                          <TableCell className="max-w-[260px] truncate">{ds.name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{ds.id}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{ds.embedding_model || '-'}</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">{ds.update_time ? new Date(ds.update_time).toLocaleString() : ''}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default KnowledgeBase;
