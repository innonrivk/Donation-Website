import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { adminApi } from '../../lib/api';
import MarkdownHelper from './MarkdownHelper';

const DonationBoxSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.preprocess((val) => (val === '' ? 0 : Math.round(parseFloat(val))), z.number().int().min(0)),
  tierId: z.preprocess((val) => (val === '' ? null : parseInt(val, 10)), z.number().int().nullable()),
  tierDetails: z.string().optional(),
  buttonText: z.string().min(1, 'Button text is required'),
  isCustomAmount: z.boolean(),
  isRecurring: z.boolean(),
  isActive: z.boolean(),
  displayOrder: z.preprocess((val) => parseInt(val, 10), z.number().int().min(0)),
});

/**
 * CMSDonationBoxes — Handles CRUD for individual donation cards.
 */
export default function CMSDonationBoxes() {
  const queryClient = useQueryClient();
  const [editingBox, setEditingBox] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [apiError, setApiError] = useState('');

  // Fetch boxes and tiers (for dropdown mapping)
  const { data: boxes = [], isLoading: loadingBoxes } = useQuery({
    queryKey: ['admin-boxes'],
    queryFn: async () => {
      const { data } = await adminApi.get('/content/donation-boxes');
      return data;
    },
  });

  const { data: tiers = [] } = useQuery({
    queryKey: ['admin-tiers'],
    queryFn: async () => {
      const { data } = await adminApi.get('/tiers');
      return data;
    },
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(DonationBoxSchema),
    defaultValues: {
      title: '', amount: 0, tierId: '', tierDetails: '',
      buttonText: 'Donate', isCustomAmount: false, isRecurring: true, isActive: true, displayOrder: 0
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editingBox) {
        return adminApi.put(`/content/donation-boxes/${editingBox.id}`, payload);
      }
      return adminApi.post('/content/donation-boxes', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-boxes'] });
      queryClient.invalidateQueries({ queryKey: ['cms'] });
      closeForm();
    },
    onError: (err) => {
      setApiError(err.response?.data?.message || err.message || 'Operation failed.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => adminApi.delete(`/content/donation-boxes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-boxes'] });
      queryClient.invalidateQueries({ queryKey: ['cms'] });
    },
    onError: (err) => {
      alert(err.response?.data?.message || err.message || 'Delete failed.');
    },
  });

  const openForm = (box = null) => {
    setApiError('');
    if (box) {
      setEditingBox(box);
      reset({
        title: box.title,
        amount: box.amount,
        tierId: box.tierId === null ? '' : box.tierId,
        tierDetails: box.tierDetails || '',
        buttonText: box.buttonText || 'Donate',
        isCustomAmount: box.isCustomAmount,
        isRecurring: box.isRecurring,
        isActive: box.isActive,
        displayOrder: box.displayOrder,
      });
    } else {
      setEditingBox(null);
      reset({
        title: '', amount: 0, tierId: '', tierDetails: '',
        buttonText: 'Donate', isCustomAmount: false, isRecurring: true, isActive: true, displayOrder: boxes.length
      });
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingBox(null);
    reset();
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this donation box?')) {
      deleteMutation.mutate(id);
    }
  };

  if (loadingBoxes) return <div className="admin-loading">Loading donation cards...</div>;

  return (
    <div className="cms-section">
      <div className="cms-section__header">
        <h2>Donation Card Configuration</h2>
        {!isFormOpen && (
          <button onClick={() => openForm()} className="cms-btn cms-btn--primary">
            + Add Donation Box
          </button>
        )}
      </div>

      {apiError && <div className="cms-error-banner">{apiError}</div>}

      {isFormOpen ? (
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="cms-form glass animate-fade-in">
          <div className="workspace-container">
            <div className="fields-workspace">
              <h3>{editingBox ? `Edit Card: ${editingBox.title}` : 'Add Donation Card Option'}</h3>

              <div className="cms-form__grid">
                <div className="cms-form__field">
                  <label>Card Title</label>
                  <input {...register('title')} placeholder="e.g. Supporter" />
                  {errors.title && <span className="field-error">{errors.title.message}</span>}
                </div>

                <div className="cms-form__field">
                  <label>Amount ($)</label>
                  <input type="number" step="0.01" {...register('amount')} placeholder="e.g. 10.00" />
                  {errors.amount && <span className="field-error">{errors.amount.message}</span>}
                </div>

                <div className="cms-form__field">
                  <label>Link to Level/Tier</label>
                  <select {...register('tierId')}>
                    <option value="">-- No Linked Tier --</option>
                    {tiers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} (${t.minAmount}+)</option>
                    ))}
                  </select>
                </div>

                <div className="cms-form__field">
                  <label>Card Highlight Subtext</label>
                  <input {...register('tierDetails')} placeholder="e.g. Ideal for individuals" />
                </div>

                <div className="cms-form__field">
                  <label>Button Text</label>
                  <input {...register('buttonText')} placeholder="e.g. Join tier" />
                </div>

                <div className="cms-form__field">
                  <label>Display Position Order</label>
                  <input type="number" {...register('displayOrder')} />
                </div>
              </div>

              <div className="cms-form__row-checkboxes">
                <label className="checkbox-label">
                  <input type="checkbox" {...register('isCustomAmount')} /> Is Custom Input Box
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" {...register('isRecurring')} /> Is Subscription / Monthly
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" {...register('isActive')} /> Is Card Active/Visible
                </label>
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
              {isSubmitting ? 'Saving...' : 'Save Card'}
            </button>
          </div>
        </form>
      ) : (
        <div className="cms-cards-grid">
          {boxes.map((box) => (
            <div key={box.id} className={`cms-card glass ${!box.isActive ? 'cms-card--inactive' : ''}`}>
              <div className="cms-card__order">#{box.displayOrder}</div>
              <h4>{box.title}</h4>
              <div className="cms-card__amount">
                {box.isCustomAmount ? 'Custom Amount' : `$${box.amount}`}
                {box.isRecurring && <span className="cms-card__freq"> / mo</span>}
              </div>
              {box.tier && <div className="cms-card__badge-tier">Linked Tier: {box.tier.name}</div>}
              <p className="cms-card__perks-summary">{box.tierDetails || 'No subtext specified.'}</p>
              <div className="cms-card__actions">
                <button onClick={() => openForm(box)} className="cms-btn-action">Edit</button>
                <button onClick={() => handleDelete(box.id)} className="cms-btn-action cms-btn-action--danger">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
