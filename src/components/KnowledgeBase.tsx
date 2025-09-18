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
import { createDataset, listDatasets, deleteDatasets, type Dataset, uploadDocuments, listDocuments, type DocumentItem, parseDocuments, stopParsing, deleteDocuments, listChunks, type ChunkItem, addChunk, deleteChunks, updateChunk, retrieveChunks } from '../services/ragflow';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

interface KnowledgeBaseProps {
  initialDatasetId?: string;
  initialDocId?: string;
  initialChunkId?: string;
  initialHighlight?: string;
}

function KnowledgeBase({
  initialDatasetId,
  initialDocId,
  initialChunkId,
  initialHighlight
}: KnowledgeBaseProps = {}) {
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
  const [highlightedChunkId, setHighlightedChunkId] = useState<string | null>(null);

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

  // Handle initial values for navigation from chat sources
  useEffect(() => {
    if (initialDatasetId && initialDatasetId !== selectedDatasetId) {
      setSelectedDatasetId(initialDatasetId);
    }
  }, [initialDatasetId]);

  useEffect(() => {
    if (initialDocId && initialDocId !== selectedDocId && selectedDatasetId) {
      setSelectedDocId(initialDocId);
    }
  }, [initialDocId, selectedDatasetId]);

  useEffect(() => {
    if (initialChunkId) {
      setHighlightedChunkId(initialChunkId);
      // Auto-scroll to the chunk (simple implementation)
      setTimeout(() => {
        const chunkElement = document.querySelector(`[data-chunk-id="${initialChunkId}"]`);
        if (chunkElement) {
          chunkElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 1000);
    }
    if (initialHighlight) {
      setRetrieveQ(initialHighlight);
      setHighlightSearch(true);
    }
  }, [initialChunkId, initialHighlight]);

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

  const deleteSelectedDocuments = async () => {
    if (!selectedDatasetId || selectedDocIds.length === 0) return;
    setBusy(true);
    try {
      await deleteDocuments(selectedDatasetId, selectedDocIds);
      setSelectedDocIds([]);
      await loadDocuments(selectedDatasetId);
      setDocsError(null);
    } catch (err) {
      setDocsError('선택된 문서 삭제 실패');
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
    setEditChunkKeywords(Array.isArray(chunk.important_keywords) ? chunk.important_keywords.join(', ') : (chunk.important_keywords || ''));
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

  // 하이라이트 함수 추가
  const highlightKeywords = (text: string, keywords: string): string => {
    if (!keywords.trim() || !highlightSearch) return text;

    const keywordList = keywords.split(/\s+/).filter(word => word.length > 0);
    let highlightedText = text;

    keywordList.forEach(keyword => {
      const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 py-0.5 rounded font-semibold">$1</mark>');
    });

    return highlightedText;
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
        highlight: highlightSearch,
        similarity_threshold: 0.1, // 낮은 임계값으로 더 많은 결과 포함
        vector_similarity_weight: 0.7, // 벡터 유사도 가중치 설정
        top_k: Math.min(retrievePageSize * 2, 100), // 리랭킹을 위해 더 많은 후보 검색
        keyword: true, // 키워드 검색도 활성화
        rerank_id: 'BAAI/bge-reranker-v2-m3' // 리랭킹 모델 활성화
      });
      console.log('Retrieve Results Debug:', res.chunks);
      setRetrieveCount(res.total);
      setRetrieveResults(res.chunks || []);
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
                <Button variant="default" size="sm" onClick={startParsingSelected} disabled={selectedDocIds.length === 0 || busy}>
                  <Icon name="play" size={16} /> 선택 파싱
                </Button>
                <Button variant="destructive" size="sm" onClick={stopParsingSelected} disabled={selectedDocIds.length === 0 || busy}>
                  <Icon name="square" size={16} /> 선택 중지
                </Button>
                <Button variant="outline" size="sm" onClick={() => loadDocuments(selectedDatasetId)} disabled={!selectedDatasetId || docsLoading}>
                  새로고침
                </Button>
                <Button variant="destructive" size="sm" onClick={deleteSelectedDocuments} disabled={selectedDocIds.length === 0 || busy}>
                  <Icon name="trash-2" size={16} /> 선택 삭제
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
                              {String(d.run ?? d.status ?? '')}{d.progress != null ? ` • ${Math.round((d.progress as number) * 100)}%` : ''}
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
                        const isHighlighted = highlightedChunkId === ch.id;
                        return (
                          <TableRow
                            key={ch.id}
                            className={cn(
                              "transition-colors",
                              isHighlighted && "bg-yellow-100 dark:bg-yellow-900/20 border-l-4 border-l-yellow-500"
                            )}
                            data-chunk-id={ch.id}
                          >
                            <TableCell className="align-top">
                              <Checkbox checked={checked} onCheckedChange={() => setSelectedChunkIds(prev => checked ? prev.filter(id => id !== ch.id) : [...prev, ch.id])} />
                            </TableCell>
                            <TableCell className="max-w-[520px] whitespace-pre-wrap break-words">
                              {isHighlighted ? (
                                <div className="p-2 bg-yellow-50 dark:bg-yellow-900/10 rounded border border-yellow-200 dark:border-yellow-800">
                                  <div className="text-xs text-yellow-600 dark:text-yellow-400 font-medium mb-1 flex items-center gap-1">
                                    <Icon name="star" size={12} />
                                    참조된 출처
                                  </div>
                                  {ch.content}
                                </div>
                              ) : (
                                ch.content
                              )}
                            </TableCell>
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !retrieveLoading && retrieveQ.trim()) {
                          handleRetrieve();
                        }
                      }}
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
                    <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                      <div className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Icon name="search" size={16} />
                        검색 결과:
                        {highlightSearch && (
                          <Badge variant="outline" className="text-xs">
                            <Icon name="star" size={12} className="mr-1" />
                            하이라이트 ON
                          </Badge>
                        )}
                      </div>
                      {retrieveResults.map((result, index) => {
                        // Try multiple possible score fields
                        const score = result.similarity_score || result.similarity || result.score ||
                                     result.vector_similarity || result.rank_score || 0;
                        const scorePercentage = Math.round(score * 100);
                        const scoreColor = scorePercentage >= 80 ? 'text-green-600 dark:text-green-400' :
                                         scorePercentage >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                                         'text-red-600 dark:text-red-400';

                        return (
                          <div key={index} className="p-4 border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  #{index + 1}
                                </Badge>
                                <div className={`text-sm font-semibold ${scoreColor}`}>
                                  유사도: {scorePercentage}%
                                </div>
                                {score !== undefined && (
                                  <div className="text-xs text-muted-foreground">
                                    (정확값: {score.toFixed(4)})
                                  </div>
                                )}
                              </div>
                              <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    scorePercentage >= 80 ? 'bg-green-500' :
                                    scorePercentage >= 60 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.max(scorePercentage, 5)}%` }}
                                />
                              </div>
                            </div>
                            <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                              {highlightSearch ? (
                                <div dangerouslySetInnerHTML={{
                                  __html: result.content_with_weight
                                    ? result.content_with_weight
                                    : highlightKeywords(result.content || '', retrieveQ)
                                }} />
                              ) : (
                                result.content
                              )}
                            </div>
                            {(result.document_name || result.chunk_id) && (
                              <div className="mt-2 pt-2 border-t border-border/50">
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  {result.document_name && (
                                    <div className="flex items-center gap-1">
                                      <Icon name="file-text" size={12} />
                                      문서: {result.document_name}
                                    </div>
                                  )}
                                  {result.chunk_id && (
                                    <div className="flex items-center gap-1">
                                      <Icon name="hash" size={12} />
                                      청크: {result.chunk_id.slice(0, 8)}...
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
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
