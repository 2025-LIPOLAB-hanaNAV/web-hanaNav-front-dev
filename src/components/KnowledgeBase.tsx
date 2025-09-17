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
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  // Chunks state
  const [chunks, setChunks] = useState<ChunkItem[]>([]);
  const [chunksLoading, setChunksLoading] = useState(false);
  const [chunksError, setChunksError] = useState<string | null>(null);
  const [chunkKeywords, setChunkKeywords] = useState('');
  const [selectedChunkIds, setSelectedChunkIds] = useState<string[]>([]);
  const [isAddChunkOpen, setIsAddChunkOpen] = useState(false);
  const [newChunkContent, setNewChunkContent] = useState('');
  const [newChunkKeywords, setNewChunkKeywords] = useState('');
  const [isEditChunkOpen, setIsEditChunkOpen] = useState(false);
  const [editingChunk, setEditingChunk] = useState<ChunkItem | null>(null);
  const [editChunkContent, setEditChunkContent] = useState('');
  const [editChunkKeywords, setEditChunkKeywords] = useState('');
  const [retrieveQ, setRetrieveQ] = useState('');
  const [retrieveLoading, setRetrieveLoading] = useState(false);
  const [retrieveCount, setRetrieveCount] = useState<number | null>(null);
  const [retrieveResults, setRetrieveResults] = useState<any[]>([]);
  const [retrievePageSize, setRetrievePageSize] = useState(10);
  const [highlightSearch, setHighlightSearch] = useState(true);

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
      await uploadDocuments(selectedDatasetId, files);
      await loadDocuments(selectedDatasetId);
    } catch (err: any) {
      setDocsError(err?.message || '업로드 실패');
    } finally {
      setBusy(false);
      if (e.target) e.target.value = '';
    }
  };

  const startParsingSelected = async () => {
    if (!selectedDatasetId || selectedDocIds.length === 0) return;
    setBusy(true);
    try {
      await parseDocuments(selectedDatasetId, selectedDocIds);
      setDocsError(null);
    } catch (err) {
      setDocsError('선택된 문서 파싱 시작 실패');
    } finally {
      setBusy(false);
    }
  };

  const stopParsingSelected = async () => {
    if (!selectedDatasetId || selectedDocIds.length === 0) return;
    setBusy(true);
    try {
      await stopParsing(selectedDatasetId, selectedDocIds);
      setDocsError(null);
    } catch (err) {
      setDocsError('선택된 문서 파싱 중지 실패');
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

  const handleEditChunk = (chunk: ChunkItem) => {
    setEditingChunk(chunk);
    setEditChunkContent(chunk.content);
    setEditChunkKeywords(chunk.important_keywords?.join(', ') || '');
    setIsEditChunkOpen(true);
  };

  const handleUpdateChunk = async () => {
    if (!selectedDatasetId || !selectedDocId || !editingChunk) return;
    const content = editChunkContent.trim();
    if (!content) return;
    setBusy(true);
    try {
      const keywords = editChunkKeywords.split(',').map(s => s.trim()).filter(Boolean);
      await updateChunk(selectedDatasetId, selectedDocId, editingChunk.id, {
        content,
        important_keywords: keywords.length ? keywords : undefined
      });
      setEditChunkContent('');
      setEditChunkKeywords('');
      setEditingChunk(null);
      setIsEditChunkOpen(false);
      await loadChunks();
    } catch (err) {
      setChunksError('청크 수정 실패');
    } finally {
      setBusy(false);
    }
  };

  const handleRetrieve = async () => {
    const q = retrieveQ.trim();
    if (!q || !selectedDatasetId) return;
    setRetrieveLoading(true);
    setRetrieveCount(null);
    setRetrieveResults([]);
    try {
      const res = await retrieveChunks({
        question: q,
        dataset_ids: [selectedDatasetId],
        document_ids: selectedDocId ? [selectedDocId] : undefined,
        page: 1,
        page_size: retrievePageSize,
        highlight: highlightSearch
      });
      setRetrieveCount(res.total);
      setRetrieveResults(res.chunks || []);
    } catch (err) {
      setChunksError('청크 검색 실패');
    } finally {
      setRetrieveLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
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
                <Button variant="default" size="sm" onClick={startParsingSelected} disabled={selectedDocIds.length === 0 || busy}>
                  <Icon name="play" size={16} /> 선택 파싱
                </Button>
                <Button variant="destructive" size="sm" onClick={stopParsingSelected} disabled={selectedDocIds.length === 0 || busy}>
                  <Icon name="square" size={16} /> 선택 중지
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
                      <TableHead className="w-10">
                        <Checkbox
                          checked={docs.length > 0 && selectedDocIds.length === docs.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedDocIds(docs.map(d => d.id));
                            } else {
                              setSelectedDocIds([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>상태</TableHead>
                      <TableHead>크기</TableHead>
                      <TableHead className="text-right">업데이트</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docsLoading ? (
                      <TableRow><TableCell colSpan={5} className="text-muted-foreground">불러오는 중...</TableCell></TableRow>
                    ) : docs.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-muted-foreground">문서가 없습니다.</TableCell></TableRow>
                    ) : (
                      docs.map(d => {
                        const checked = selectedDocIds.includes(d.id);
                        return (
                          <TableRow key={d.id}>
                            <TableCell className="align-top">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => {
                                  setSelectedDocIds(prev =>
                                    checked ? prev.filter(id => id !== d.id) : [...prev, d.id]
                                  );
                                }}
                              />
                            </TableCell>
                            <TableCell className="max-w-[360px] truncate">{d.name}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {String(d.run ?? d.status ?? '')}{d.progress != null ? ` • ${Math.round((d.progress as number) * 100) / 100}%` : ''}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{d.size ? `${d.size}B` : '-'}</TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">{d.update_time ? new Date(d.update_time).toLocaleString() : ''}</TableCell>
                          </TableRow>
                        );
                      })
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

                <Dialog open={isEditChunkOpen} onOpenChange={setIsEditChunkOpen}>
                  <DialogContent className="max-w-xl">
                    <DialogHeader>
                      <DialogTitle>청크 수정</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <Textarea
                        rows={6}
                        placeholder="청크 내용"
                        value={editChunkContent}
                        onChange={(e) => setEditChunkContent(e.target.value)}
                      />
                      <Input
                        placeholder="키워드(쉼표로 구분)"
                        value={editChunkKeywords}
                        onChange={(e) => setEditChunkKeywords(e.target.value)}
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsEditChunkOpen(false)}>취소</Button>
                        <Button onClick={handleUpdateChunk} disabled={!editChunkContent.trim() || busy}>수정</Button>
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
                      <TableHead className="w-20">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chunksLoading ? (
                      <TableRow><TableCell colSpan={4} className="text-muted-foreground">불러오는 중...</TableCell></TableRow>
                    ) : chunks.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-muted-foreground">청크가 없습니다.</TableCell></TableRow>
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
                            <TableCell className="align-top">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditChunk(ch)}
                                disabled={busy}
                              >
                                <Icon name="edit" size={14} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="search" size={16} />
                  <span className="font-medium">벡터DB 검색</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      className="flex-1"
                      placeholder="질문을 입력하세요"
                      value={retrieveQ}
                      onChange={(e) => setRetrieveQ(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetrieve}
                      disabled={retrieveLoading || !retrieveQ.trim()}
                    >
                      {retrieveLoading ? '검색 중...' : '검색'}
                    </Button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">결과 수:</span>
                      <Select value={retrievePageSize.toString()} onValueChange={(v) => setRetrievePageSize(parseInt(v))}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={highlightSearch}
                        onCheckedChange={(checked) => setHighlightSearch(Boolean(checked))}
                      />
                      <span className="text-sm text-muted-foreground">하이라이트</span>
                    </div>
                    {retrieveCount != null && (
                      <Badge variant="secondary">총 {retrieveCount}건</Badge>
                    )}
                  </div>
                  {retrieveResults.length > 0 && (
                    <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
                      <div className="text-sm font-medium mb-2">검색 결과:</div>
                      {retrieveResults.map((result, index) => (
                        <div key={index} className="p-3 border rounded-md bg-muted/30">
                          <div className="text-xs text-muted-foreground mb-1">
                            Score: {result.similarity_score?.toFixed(4) || 'N/A'}
                          </div>
                          <div className="text-sm whitespace-pre-wrap break-words">
                            {highlightSearch && result.content_with_weight
                              ? result.content_with_weight
                              : result.content
                            }
                          </div>
                        </div>
                      ))}
                    </div>
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
