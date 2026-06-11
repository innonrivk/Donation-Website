import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { adminApi } from '../../lib/api';
import TipTapEditor from './TipTapEditor';
import MarkdownHelper from './MarkdownHelper';

const ContentSchema = z.object({
  head: z.string().min(1, 'Title heading is required'),
  subtitle: z.string().min(1, 'Subtitle description is required'),
  body: z.string().min(1, 'Body text is required'),
  version: z.preprocess((val) => parseInt(val, 10), z.number().int().min(1)),
});

/**
 * CMSWebsiteContent — Handles CRUD operations for site text content blocks.
 */
export default function CMSWebsiteContent() {
  const queryClient = useQueryClient();
  const [editingContent, setEditingContent] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [apiError, setApiError] = useState('');

  // Fetch website contents
  const { data: contents = [], isLoading } = useQuery({
    queryKey: ['admin-contents'],
    queryFn: async () => {
      const { data } = await adminApi.get('/content');
      return data;
    },
  });

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(ContentSchema),
    defaultValues: { head: '', subtitle: '', body: '', version: 1 },
  });

  const mutation = useMutation({
    mutationFn: async (payload) => {
      if (editingContent) {
        return adminApi.put(`/content/${editingContent.id}`, payload);
      }
      return adminApi.post('/content', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-contents'] });
      queryClient.invalidateQueries({ queryKey: ['cms'] }); // public client cache
      closeForm();
    },
    onError: (err) => {
      setApiError(err.response?.data?.message || err.message || 'Operation failed.');
    },
  });

  const openForm = (content = null) => {
    setApiError('');
    if (content) {
      setEditingContent(content);
      reset({
        head: content.head,
        subtitle: content.subtitle,
        body: content.body,
        version: content.version,
      });
    } else {
      setEditingContent(null);
      reset({ head: '', subtitle: '', body: '', version: contents[0] ? contents[0].version + 1 : 1 });
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingContent(null);
    reset();
  };

  const onSubmit = (data) => {
    setApiError('');
    mutation.mutate(data);
  };

  if (isLoading) return <div className="admin-loading">Loading content blocks...</div>;

  return (
    <div className="cms-section">
      <div className="cms-section__header">
        <h2>Website Headline & Body Text</h2>
        {!isFormOpen && (
          <button onClick={() => openForm()} className="cms-btn cms-btn--primary">
            + New Version Block
          </button>
        )}
      </div>

      {apiError && <div className="cms-error-banner">{apiError}</div>}

      {isFormOpen ? (
        <form onSubmit={handleSubmit(onSubmit)} className="cms-form glass animate-fade-in">
          <div className="workspace-container">
            <div className="fields-workspace">
              <h3>{editingContent ? `Edit Version Block v${editingContent.version}` : 'Create New Version Block'}</h3>

              <div className="cms-form__field">
                <label>Heading</label>
                <input {...register('head')} placeholder="e.g. Help volunteer educators build schools" />
                {errors.head && <span className="field-error">{errors.head.message}</span>}
              </div>

              <div className="cms-form__field">
                <label>Subtitle Description</label>
                <input {...register('subtitle')} placeholder="e.g. Join the 500+ sponsors supporting OpenmindProjects camps..." />
                {errors.subtitle && <span className="field-error">{errors.subtitle.message}</span>}
              </div>

              <div className="cms-form__field">
                <label>Version Number</label>
                <input type="number" {...register('version')} disabled={!!editingContent} />
                {errors.version && <span className="field-error">{errors.version.message}</span>}
              </div>

              <div className="cms-form__field">
                <label>Content Body (Rich HTML)</label>
                <Controller
                  name="body"
                  control={control}
                  render={({ field }) => (
                    <TipTapEditor value={field.value} onChange={field.onChange} />
                  )}
                />
                {errors.body && <span className="field-error">{errors.body.message}</span>}
              </div>
            </div>

            <div className="sidebar-workspace">
              <MarkdownHelper />
            </div>
          </div>

          <div className="cms-form__actions">
            <button type="button" onClick={closeForm} className="cms-btn cms-btn--secondary" disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="cms-btn cms-btn--primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Content'}
            </button>
          </div>
        </form>
      ) : (
        <div className="cms-table-container">
          <table className="cms-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Heading</th>
                <th>Subtitle</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contents.map((item) => (
                <tr key={item.id} className={item.id === contents[0]?.id ? 'row-active' : ''}>
                  <td><strong>v{item.version}</strong> {item.id === contents[0]?.id && <span className="badge">Active</span>}</td>
                  <td>{item.head}</td>
                  <td>{item.subtitle}</td>
                  <td>{new Date(item.updatedAt).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => openForm(item)} className="cms-btn-action">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
