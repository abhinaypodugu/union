import { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  PostCard,
  Avatar,
  IconButton,
  Button,
  SegmentedControl,
  Input,
  Textarea,
  Field,
  Dialog,
} from '../components';

interface HomeScreenProps {
  onOpenProfile: () => void;
  onOpenCase?: (caseId: string) => void;
}

export function HomeScreen({ onOpenProfile }: HomeScreenProps) {
  const { currentTenant, currentMember, posts, toggleLikePost, addComment, createPost } = useApp();
  const [filter, setFilter] = useState<string>('For you');
  const [composerOpen, setComposerOpen] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Stories/Groups avatar row
  const groupsRow = [
    { name: currentMember.unit || 'Hyderabad', kind: 'City', unread: true },
    { name: currentMember.region || 'Telangana', kind: 'State', unread: true },
    { name: currentMember.country || 'India', kind: 'National', unread: false },
    ...(currentMember.groups.map((g) => ({ name: g, kind: 'Group', unread: true }))),
    { name: 'Community', kind: 'Space', unread: false },
  ];

  const filteredPosts = posts.filter((p) => {
    if (filter === 'Announcements') return p.kind === 'official';
    if (filter === 'My groups') return p.kind !== 'official';
    return true; // "For you"
  });

  const handleCreatePost = () => {
    if (!newPostText.trim()) return;
    createPost({
      kind: 'member',
      body: newPostText.trim(),
      audienceScope: 'group',
      audienceLabel: `${currentMember.unit} · ${currentMember.groups[0] || 'Members'}`,
    });
    setNewPostText('');
    setComposerOpen(false);
  };

  const handleAddComment = (postId: string) => {
    if (!commentText.trim()) return;
    addComment(postId, commentText.trim());
    setCommentText('');
    setActiveCommentPostId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', paddingBottom: 24 }}>
      {/* Header */}
      <header
        style={{
          padding: '20px 16px 10px',
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          background: 'var(--paper-50)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="cm-overline" style={{ marginBottom: 4 }}>
            {currentTenant.name}
          </div>
          <h1
            style={{
              margin: 0,
              font: 'var(--text-display-m)',
              letterSpacing: 'var(--tracking-display)',
              color: 'var(--ink-900)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            Home
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <IconButton
            icon="square-pen"
            label="Create post"
            size="lg"
            onClick={() => setComposerOpen(true)}
          />
          <button
            onClick={onOpenProfile}
            style={{
              border: 0,
              background: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Profile"
          >
            <Avatar name={currentMember.name} size={34} />
          </button>
        </div>
      </header>

      {/* Group Stories Row */}
      <div
        style={{
          display: 'flex',
          gap: 14,
          overflowX: 'auto',
          padding: '6px 16px 14px',
          scrollbarWidth: 'none',
        }}
      >
        {groupsRow.map((g) => (
          <div
            key={g.name}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              flex: 'none',
              width: 64,
            }}
          >
            <span
              style={{
                padding: 2.5,
                borderRadius: '50%',
                boxShadow: g.unread ? 'inset 0 0 0 2px var(--accent)' : 'inset 0 0 0 1px var(--paper-300)',
              }}
            >
              <div style={{ boxShadow: '0 0 0 2px var(--paper-50)', borderRadius: '50%' }}>
                <Avatar name={g.name} size={52} />
              </div>
            </span>
            <span
              style={{
                font: '600 11.5px/1.15 var(--font-sans)',
                color: 'var(--ink-800)',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 64,
              }}
            >
              {g.name}
            </span>
          </div>
        ))}
      </div>

      {/* Feed Filters */}
      <div
        style={{
          padding: '0 16px 12px',
          position: 'sticky',
          top: 0,
          zIndex: 3,
          background: 'var(--paper-50)',
        }}
      >
        <SegmentedControl
          block
          value={filter}
          onChange={setFilter}
          items={['For you', 'My groups', 'Announcements']}
        />
      </div>

      {/* Feed Posts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '2px 12px 24px' }}>
        {filteredPosts.map((p) => (
          <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <PostCard
              kind={p.kind}
              author={p.author}
              source={p.source}
              audience={p.audience}
              time={p.time}
              title={p.title}
              body={p.body}
              media={p.media}
              pinned={p.pinned}
              liked={!!p.likedByMe}
              likes={p.likes}
              comments={p.comments ? p.comments.length : 0}
              onLike={() => toggleLikePost(p.id)}
              onComment={() => setActiveCommentPostId(p.id)}
            />

            {/* Comment Section Footer */}
            {p.comments && p.comments.length > 0 && (
              <div
                style={{
                  margin: '0 8px',
                  padding: '10px 14px',
                  background: 'var(--paper-100)',
                  borderRadius: 'var(--radius-m)',
                  fontSize: 13,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ font: '600 11px/1 var(--font-mono)', color: 'var(--ink-500)', textTransform: 'uppercase' }}>
                  Comments ({p.comments.length})
                </div>
                {p.comments.slice(-2).map((c) => (
                  <div key={c.id} style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{c.author}:</span>
                    <span style={{ color: 'var(--ink-700)', flex: 1 }}>{c.text}</span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setActiveCommentPostId(p.id)}
                  style={{
                    border: 0,
                    background: 'none',
                    padding: 0,
                    textAlign: 'left',
                    color: 'var(--accent)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  Reply or view discussion…
                </button>
              </div>
            )}

            {(!p.comments || p.comments.length === 0) && (
              <div style={{ margin: '0 8px', display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  icon="message-circle"
                  onClick={() => setActiveCommentPostId(p.id)}
                >
                  Comment
                </Button>
              </div>
            )}
          </div>
        ))}

        <div
          style={{
            textAlign: 'center',
            font: 'var(--text-body-s)',
            color: 'var(--text-muted)',
            padding: '14px 0',
          }}
        >
          You’re all caught up · newest first
        </div>
      </div>

      {/* Member Post Composer Dialog */}
      <Dialog
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        title="Share with your group"
        description={`Posting to ${currentMember.unit} · ${currentMember.groups[0] || 'All members'}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setComposerOpen(false)}>
              Cancel
            </Button>
            <Button
              icon="send"
              disabled={!newPostText.trim()}
              onClick={handleCreatePost}
            >
              Post update
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="What’s happening?">
            <Textarea
              rows={4}
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              placeholder="Share news, workplace updates, or questions for colleagues…"
            />
          </Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" icon="image">
              Attach photo
            </Button>
            <Button variant="secondary" size="sm" icon="paperclip">
              Attach document
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Comment Modal */}
      <Dialog
        open={activeCommentPostId !== null}
        onClose={() => setActiveCommentPostId(null)}
        title="Add a comment"
        description="Visible to all members in this audience."
        footer={
          <>
            <Button variant="secondary" onClick={() => setActiveCommentPostId(null)}>
              Cancel
            </Button>
            <Button
              icon="send"
              disabled={!commentText.trim()}
              onClick={() => activeCommentPostId && handleAddComment(activeCommentPostId)}
            >
              Submit comment
            </Button>
          </>
        }
      >
        <Field label="Your comment">
          <Input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a constructive response…"
            autoFocus
          />
        </Field>
      </Dialog>
    </div>
  );
}
