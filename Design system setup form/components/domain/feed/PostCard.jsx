import React from 'react';
import { Icon } from '../../core/Icon.jsx';
import { Avatar } from '../../core/Avatar.jsx';
import { IconButton } from '../../core/IconButton.jsx';
import { AudienceLabel } from './AudienceLabel.jsx';

export function PostCard({ kind = 'member', author = { name: '' }, source, audience, time, title, body, media, pinned = false, likes = 0, comments = 0, liked = false, onLike, onComment, onShare }) {
  const official = kind === 'official';
  const committee = kind === 'committee';
  return (
    <article className={'cm-post' + (official ? ' cm-post--official' : '') + (committee ? ' cm-post--committee' : '')}>
      {official && (
        <div className="cm-post__flag">
          <Icon name="badge-check" size={14} strokeWidth={2} /> Official announcement
          {pinned && <span className="cm-post__flag-right"><Icon name="pin" size={13} strokeWidth={2} /> Pinned</span>}
        </div>
      )}
      {committee && (
        <div className="cm-post__flag cm-post__flag--private">
          <Icon name="lock" size={13} strokeWidth={2} /> Committee-private · not visible to members
        </div>
      )}
      <header className="cm-post__head">
        <Avatar name={author.name} size={40} official={official || author.official} />
        <div className="cm-post__who">
          <div className="cm-post__name">{author.name}{author.role && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>· {author.role}</span>}</div>
          <div className="cm-post__meta">
            {source && <span>{source}</span>}
            {source && time && <i className="cm-post__sep" />}
            {time && <span style={{ flex: 'none' }}>{time}</span>}
          </div>
        </div>
        <IconButton icon="ellipsis" label="Post options" size="sm" />
      </header>
      {title && <h3 className="cm-post__title">{title}</h3>}
      {body && <p className="cm-post__body">{body}</p>}
      {media && <div className="cm-post__media">{typeof media === 'string' && /^(https?:|\.|\/|data:)/.test(media) ? <img src={media} alt="" /> : (media === true ? 'photo' : media)}</div>}
      <div className="cm-post__actions">
        <button className={'cm-post__act' + (liked ? ' cm-post__act--on' : '')} onClick={onLike} aria-pressed={liked}><Icon name="heart" size={19} />{likes > 0 && likes}</button>
        <button className="cm-post__act" onClick={onComment}><Icon name="message-circle" size={19} />{comments > 0 && comments}</button>
        {!committee && <button className="cm-post__act" onClick={onShare}><Icon name="share-2" size={18} /></button>}
        <span style={{ marginLeft: 'auto', paddingRight: 8 }}>{audience && <AudienceLabel {...audience} />}</span>
      </div>
    </article>
  );
}
