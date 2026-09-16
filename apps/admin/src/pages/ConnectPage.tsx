import { useState } from 'react';
import { Plus, Pencil, Trash2, GripVertical, ExternalLink } from 'lucide-react';
import { Button, Card, Input, Modal } from '../components/ui';
import { useConnectCardManagement } from '../hooks/useConnectCardManagement';

type ConnectCardCategory = 'COMMUNITY' | 'SPONSOR' | 'SOCIAL' | 'OTHER';

interface ConnectCardForm {
  title: string;
  description: string;
  url: string;
  iconName: string;
  category: ConnectCardCategory;
  enabled: boolean;
}

const CATEGORIES: { value: ConnectCardCategory; label: string }[] = [
  { value: 'COMMUNITY', label: 'Community' },
  { value: 'SPONSOR', label: 'Sponsor' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'OTHER', label: 'Other' },
];

const INITIAL_FORM: ConnectCardForm = {
  title: '',
  description: '',
  url: '',
  iconName: '',
  category: 'COMMUNITY',
  enabled: true,
};

export default function ConnectPage() {
  const [selectedCategory, setSelectedCategory] = useState<ConnectCardCategory | 'ALL'>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [formData, setFormData] = useState<ConnectCardForm>(INITIAL_FORM);

  const {
    cards,
    isLoading,
    createCard,
    updateCard,
    deleteCard,
    isCreating,
    isUpdating,
    isDeleting,
  } = useConnectCardManagement(selectedCategory);

  const handleCreate = async () => {
    const success = await createCard(formData);
    if (success) {
      setIsCreateModalOpen(false);
      setFormData(INITIAL_FORM);
    }
  };

  const handleEdit = async () => {
    if (!editingCard) return;
    const success = await updateCard(editingCard.id, formData);
    if (success) {
      setIsEditModalOpen(false);
      setEditingCard(null);
      setFormData(INITIAL_FORM);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this connect card?')) return;
    await deleteCard(id);
  };

  const openEditModal = (card: any) => {
    setEditingCard(card);
    setFormData({
      title: card.title,
      description: card.description || '',
      url: card.url,
      iconName: card.iconName || '',
      category: card.category,
      enabled: card.enabled,
    });
    setIsEditModalOpen(true);
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setEditingCard(null);
    setFormData(INITIAL_FORM);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Connect Cards</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage community links, sponsors, and social connections
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Card
        </Button>
      </div>

      {/* Filter */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-zinc-300">Filter by Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as ConnectCardCategory | 'ALL')}
            className="w-48 appearance-none bg-white dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] rounded-lg text-sm text-[#2D253A] dark:text-[#F3EFFC] py-2 pl-3 pr-8 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Cards List */}
      {isLoading ? (
        <div className="text-center py-12 text-zinc-400">Loading cards...</div>
      ) : cards.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-zinc-400">No connect cards found. Create your first one!</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {cards.map((card) => (
            <Card key={card.id} className="p-4">
              <div className="flex items-start gap-4">
                {/* Drag Handle */}
                <div className="pt-1 text-zinc-500 cursor-move">
                  <GripVertical className="w-5 h-5" />
                </div>

                {/* Card Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            card.category === 'COMMUNITY'
                              ? 'bg-blue-500/20 text-blue-300'
                              : card.category === 'SPONSOR'
                              ? 'bg-purple-500/20 text-purple-300'
                              : card.category === 'SOCIAL'
                              ? 'bg-green-500/20 text-green-300'
                              : 'bg-zinc-500/20 text-zinc-300'
                          }`}
                        >
                          {card.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            card.enabled
                              ? 'bg-green-500/20 text-green-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {card.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      {card.description && (
                        <p className="text-sm text-zinc-400 mt-1">{card.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                        <a
                          href={card.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-amber-400 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {card.url}
                        </a>
                        {card.iconName && <span>Icon: {card.iconName}</span>}
                        <span>Order: {card.displayOrder}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(card)}
                        className="text-zinc-400 hover:text-white"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(card.id)}
                        disabled={isDeleting}
                        className="text-zinc-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={closeModals} title="Create Connect Card">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Join our Discord"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Description</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional tagline"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">URL *</label>
            <Input
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://discord.gg/..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Icon Name</label>
            <Input
              value={formData.iconName}
              onChange={(e) => setFormData({ ...formData, iconName: e.target.value })}
              placeholder="e.g., MessageCircle, Heart (Lucide icon name)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Category *</label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value as ConnectCardCategory })
              }
              className="w-full appearance-none bg-white dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] rounded-lg text-sm text-[#2D253A] dark:text-[#F3EFFC] py-2 pl-3 pr-8 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled-create"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="enabled-create" className="text-sm text-zinc-300">
              Enabled
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={closeModals}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating || !formData.title || !formData.url}>
              {isCreating ? 'Creating...' : 'Create Card'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={closeModals} title="Edit Connect Card">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Join our Discord"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Description</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional tagline"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">URL *</label>
            <Input
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://discord.gg/..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Icon Name</label>
            <Input
              value={formData.iconName}
              onChange={(e) => setFormData({ ...formData, iconName: e.target.value })}
              placeholder="e.g., MessageCircle, Heart (Lucide icon name)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">Category *</label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value as ConnectCardCategory })
              }
              className="w-full appearance-none bg-white dark:bg-[#120E1C] border border-[#E8E2D8] dark:border-[#2A223D] rounded-lg text-sm text-[#2D253A] dark:text-[#F3EFFC] py-2 pl-3 pr-8 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enabled-edit"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="enabled-edit" className="text-sm text-zinc-300">
              Enabled
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={closeModals}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isUpdating || !formData.title || !formData.url}>
              {isUpdating ? 'Updating...' : 'Update Card'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
