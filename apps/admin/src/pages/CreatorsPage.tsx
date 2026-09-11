import React, { useState } from 'react';
import {
  Feather,
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  BookOpen,
  FileText,
  UserCheck,
  Eye
} from 'lucide-react';
import { useCreatorVerification } from '../hooks/useCreatorVerification';
import { CreatorApplication, ModeratedStory } from '../types';
import { Card, CardHeader, Badge, Button, Modal } from '../components/ui';

export const CreatorsPage: React.FC = () => {
  const {
    creators,
    pendingCount,
    moderatedStories,
    flaggedStoriesCount,
    activeTab,
    setActiveTab,
    appFilter,
    setAppFilter,
    appsLoading,
    appsError,
    storiesLoading,
    storiesError,
    approveCreator,
    rejectCreator,
    setStoryStatus,
  } = useCreatorVerification();

  const [selectedApp, setSelectedApp] = useState<CreatorApplication | null>(null);
  const [selectedStory, setSelectedStory] = useState<ModeratedStory | null>(null);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E8E2D8] dark:border-[#2A223D]">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#2D253A] dark:text-[#F3EFFC] tracking-wide">
            Verified Writers & Story Moderation
          </h1>
          <p className="text-xs md:text-sm text-[#6D6282] dark:text-[#9E94B3] mt-1">
            Author onboarding queue and self-published community content oversight
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-[#FAF7F2] dark:bg-[#120E1C] p-1 rounded-xl border border-[#E8E2D8] dark:border-[#2A223D]">
          <button
            onClick={() => setActiveTab('applications')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'applications'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-[#6D6282] dark:text-[#9E94B3] hover:text-[#2D253A] dark:hover:text-[#F3EFFC]'
            }`}
          >
            <Feather className="w-3.5 h-3.5" />
            <span>Applications Queue</span>
            {pendingCount > 0 && (
              <Badge variant="amber" size="sm">
                {pendingCount}
              </Badge>
            )}
          </button>

          <button
            onClick={() => setActiveTab('moderation')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'moderation'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-[#6D6282] dark:text-[#9E94B3] hover:text-[#2D253A] dark:hover:text-[#F3EFFC]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Story Moderation</span>
            {flaggedStoriesCount > 0 && (
              <Badge variant="error" size="sm">
                {flaggedStoriesCount}
              </Badge>
            )}
          </button>
        </div>
      </div>

      {/* Applications Tab */}
      {activeTab === 'applications' && (
        <div className="space-y-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setAppFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  appFilter === status
                    ? 'bg-purple-600/10 dark:bg-[#211A34] text-purple-700 dark:text-purple-300 border border-purple-500/40'
                    : 'text-[#6D6282] dark:text-[#9E94B3] hover:text-[#2D253A] dark:hover:text-[#F3EFFC] border border-transparent'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Applications Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {appsLoading && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-52 rounded-xl animate-pulse bg-[#FAF7F2] dark:bg-[#1A1528] border border-[#E8E2D8] dark:border-[#2A223D]" />
            ))}
            {appsError && (
              <div className="col-span-3 text-center py-12 text-sm text-rose-500 dark:text-rose-400">
                Failed to load applications. Check your connection and try refreshing.
              </div>
            )}
            {!appsLoading && !appsError && creators.length === 0 && (
              <div className="col-span-3 text-center py-12 text-sm text-[#6D6282] dark:text-[#9E94B3]">
                No applications match the selected filter.
              </div>
            )}
            {!appsLoading && !appsError && creators.map((app) => (
              <Card
                key={app.id}
                className="flex flex-col justify-between hover:border-purple-500/40 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-[#2D253A] dark:text-[#F3EFFC]">{app.penName}</h3>
                      <div className="text-xs text-[#6D6282] dark:text-[#9E94B3]">
                        {app.applicantName} &bull; {app.email}
                      </div>
                    </div>
                    <Badge
                      variant={
                        app.status === 'APPROVED'
                          ? 'success'
                          : app.status === 'REJECTED'
                          ? 'error'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {app.status}
                    </Badge>
                  </div>

                  <div className="p-2.5 bg-[#FAF7F2] dark:bg-[#120E1C] rounded-lg border border-[#E8E2D8] dark:border-[#2A223D] space-y-1 text-xs">
                    <div className="text-[10px] uppercase font-semibold text-[#9E94AB] dark:text-[#6D6282]">
                      Sample Tome:
                    </div>
                    <div className="font-semibold text-purple-700 dark:text-purple-300">{app.sampleTitle}</div>
                    <p className="text-[#6D6282] dark:text-[#9E94B3] text-[11px] line-clamp-2">
                      {app.sampleSynopsis}
                    </p>
                  </div>

                  <div className="text-xs text-[#6D6282] dark:text-[#9E94B3]">
                    <span className="text-[#9E94AB] dark:text-[#6D6282] font-medium">Genre:</span> {app.primaryGenre}
                  </div>

                  {app.portfolioUrl && (
                    <a
                      href={app.portfolioUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1"
                    >
                      View Author Portfolio
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-[#E8E2D8] dark:border-[#2A223D] flex items-center justify-between gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setSelectedApp(app)}
                  >
                    Inspect Pitch
                  </Button>

                  {app.status === 'PENDING' && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => rejectCreator(app.id)}
                        icon={<XCircle className="w-3 h-3" />}
                        className="text-xs"
                      >
                        Reject
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => approveCreator(app.id)}
                        icon={<CheckCircle className="w-3 h-3" />}
                        className="text-xs"
                      >
                        Approve
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Story Moderation Tab */}
      {activeTab === 'moderation' && (
        <div className="space-y-4">
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAF7F2] dark:bg-[#120E1C] border-b border-[#E8E2D8] dark:border-[#2A223D] text-[11px] uppercase tracking-wider text-[#9E94AB] dark:text-[#6D6282] font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Story & Chapter</th>
                  <th className="py-3.5 px-4">Author</th>
                  <th className="py-3.5 px-4">Flag Reason</th>
                  <th className="py-3.5 px-4">Risk Score</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E2D8] dark:divide-[#2A223D] text-xs">
                {storiesLoading && Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-4 rounded animate-pulse bg-[#FAF7F2] dark:bg-[#1A1528]" />
                    </td>
                  </tr>
                ))}
                {storiesError && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-rose-500 dark:text-rose-400">
                      Failed to load moderation queue. Check your connection and try refreshing.
                    </td>
                  </tr>
                )}
                {!storiesLoading && !storiesError && moderatedStories.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#6D6282] dark:text-[#9E94B3]">
                      No stories in the moderation queue.
                    </td>
                  </tr>
                )}
                {!storiesLoading && !storiesError && moderatedStories.map((story) => (
                  <tr key={story.id} className="table-row-hover">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#2D253A] dark:text-[#F3EFFC]">{story.title}</div>
                      <div className="text-[10px] text-[#9E94AB] dark:text-[#6D6282]">
                        {story.wordCount.toLocaleString()} words &bull; {story.reportedAt}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-[#6D6282] dark:text-[#9E94B3]">
                      {story.authorName}
                    </td>

                    <td className="py-3.5 px-4 max-w-sm">
                      <p className="text-[#6D6282] dark:text-[#9E94B3] line-clamp-1">{story.flagReason}</p>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-xs ${
                          story.riskScore > 80
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                            : story.riskScore > 50
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {story.riskScore}%
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge
                        variant={
                          story.status === 'APPROVED'
                            ? 'success'
                            : story.status === 'QUARANTINED'
                            ? 'error'
                            : 'warning'
                        }
                        size="sm"
                        dot
                      >
                        {story.status}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedStory(story)}
                          className="text-xs text-purple-700 dark:text-purple-300"
                        >
                          Review Excerpt
                        </Button>
                        {story.status !== 'APPROVED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setStoryStatus(story.id, 'APPROVED')}
                            className="text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                          >
                            Approve
                          </Button>
                        )}
                        {story.status !== 'QUARANTINED' && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setStoryStatus(story.id, 'QUARANTINED')}
                            className="text-xs"
                          >
                            Quarantine
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Inspect Application Modal */}
      {selectedApp && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedApp(null)}
          title={`Creator Application: ${selectedApp.penName}`}
          subtitle={`Submitted by ${selectedApp.applicantName} (${selectedApp.email})`}
          footer={
            <div className="flex items-center justify-between w-full">
              <Button variant="ghost" size="sm" onClick={() => setSelectedApp(null)}>
                Close
              </Button>
              {selectedApp.status === 'PENDING' && (
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      rejectCreator(selectedApp.id);
                      setSelectedApp(null);
                    }}
                  >
                    Reject Application
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      approveCreator(selectedApp.id);
                      setSelectedApp(null);
                    }}
                  >
                    Approve as Verified Writer
                  </Button>
                </div>
              )}
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div>
              <span className="text-[#9E94AB] dark:text-[#6D6282] uppercase font-semibold block mb-1">
                Serialization Pitch:
              </span>
              <p className="p-3 bg-[#FAF7F2] dark:bg-[#120E1C] rounded-lg border border-[#E8E2D8] dark:border-[#2A223D] text-[#2D253A] dark:text-[#F3EFFC] leading-relaxed">
                {selectedApp.pitch}
              </p>
            </div>

            <div>
              <span className="text-[#9E94AB] dark:text-[#6D6282] uppercase font-semibold block mb-1">
                Sample Work Synopsis:
              </span>
              <p className="p-3 bg-[#FAF7F2] dark:bg-[#120E1C] rounded-lg border border-[#E8E2D8] dark:border-[#2A223D] text-[#6D6282] dark:text-[#9E94B3] leading-relaxed">
                {selectedApp.sampleSynopsis}
              </p>
            </div>

            {selectedApp.portfolioUrl && (
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-500/20 rounded-lg">
                <a
                  href={selectedApp.portfolioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-700 dark:text-purple-300 hover:underline flex items-center gap-1 font-semibold"
                >
                  Inspect External Portfolio Link &rarr;
                </a>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Inspect Moderated Excerpt Modal */}
      {selectedStory && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedStory(null)}
          title={`Content Inspection: ${selectedStory.title}`}
          subtitle={`Flagged for: ${selectedStory.flagReason}`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button variant="ghost" size="sm" onClick={() => setSelectedStory(null)}>
                Close
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setStoryStatus(selectedStory.id, 'QUARANTINED');
                    setSelectedStory(null);
                  }}
                >
                  Quarantine Story
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setStoryStatus(selectedStory.id, 'APPROVED');
                    setSelectedStory(null);
                  }}
                >
                  Clear & Approve
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-700 dark:text-rose-300">
              <span className="font-semibold block mb-1">Automated AI Trigger:</span>
              {selectedStory.flagReason}
            </div>

            <div>
              <span className="text-[#9E94AB] dark:text-[#6D6282] uppercase font-semibold block mb-1">
                Flagged Excerpt:
              </span>
              <pre className="p-3 bg-[#FAF7F2] dark:bg-[#120E1C] rounded-lg border border-[#E8E2D8] dark:border-[#2A223D] text-[#2D253A] dark:text-[#F3EFFC] whitespace-pre-wrap font-serif text-sm leading-relaxed">
                {selectedStory.excerptSnippet}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
