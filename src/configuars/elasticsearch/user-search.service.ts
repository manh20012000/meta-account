// src/modules/search/user-search.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
type Hit = { _id: string; _source: any };

@Injectable()
export class UserElasticsearchchService {
  private readonly index = 'users'; // alias
  constructor(private readonly es: ElasticsearchService) {}

  async indexUser(u: {
    _id: string;
    name?: string;
    email?: string;
    avatar?: string;
    status?: string;
    createdAt?: Date | string;
  }) {
    return this.es.index({
      index: this.index,
      id: u._id,
      document: {
        ...u,
        createdAt: u.createdAt ?? new Date().toISOString(),
      },
      refresh: false, // nhanh; dùng refresh:'wait_for' nếu test cần thấy ngay
    });
  }

  async deleteUser(id: string) {
    return this.es.delete({ index: this.index, id });
  }

  async searchByName(q: string, limit = 20) {
    // ưu tiên match chính xác name.raw, sau đó prefix/fuzzy trên name, firstName, lastName
    return this.es.search({
      index: this.index,
      size: limit,
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: q,
                type: 'best_fields',
                fields: [
                  'name^3',
                  'name.raw^5', // đẩy exact lên
                ],
                operator: 'or',
                fuzziness: 'AUTO', // fuzzy nhẹ
              },
            },
          ],
        },
      },
      // gợi ý: thêm highlight nếu cần
    });
  }
  async searchByNamePaged(q: string, page = 1, limit = 10) {
    const from = (page - 1) * limit;
    const res = await this.es.search({
      index: this.index,
      from,
      size: limit,
      query: {
        multi_match: {
          query: q,
          type: 'best_fields',
          fields: ['name^3', 'name.raw^5'],
          operator: 'or',
          fuzziness: 'AUTO',
        },
      },
    });

    const hits = (res.hits?.hits ?? []) as Hit[];
    const total =
      typeof res.hits?.total === 'number'
        ? res.hits.total
        : ((res.hits?.total as any)?.value ?? hits.length);

    const data = hits.map((h) => {
      const src = h._source || {};
      return {
        _id: src._id ?? h._id,
        name: src.name ?? '',
        avatar: src.avatar ?? null,
        phone: src.phone ?? undefined,
      };
    });

    return { data, total: Number(total) };
  }

  /**
   * Tìm theo số điện thoại (exact/partial) bằng ES.
   * Ưu tiên phone_digits nếu có; fallback về phone.keyword.
   */
  async searchByPhonePaged(phoneDigits: string, page = 1, limit = 10) {
    const from = (page - 1) * limit;

    // Nếu bạn đã index `phone_digits`: dùng should term + wildcard trên phone_digits.
    const res = await this.es.search({
      index: this.index,
      from,
      size: limit,
      query: {
        bool: {
          should: [
            { term: { phone_digits: phoneDigits } }, // exact theo digits
            { wildcard: { phone_digits: `*${phoneDigits}*` } }, // partial
            // Fallback thêm nếu chưa có phone_digits:
            { term: { 'phone.keyword': phoneDigits } },
            { wildcard: { 'phone.keyword': `*${phoneDigits}*` } },
          ],
          minimum_should_match: 1,
        },
      },
    });

    const hits = (res.hits?.hits ?? []) as Hit[];
    const total =
      typeof res.hits?.total === 'number'
        ? res.hits.total
        : ((res.hits?.total as any)?.value ?? hits.length);

    const data = hits.map((h) => {
      const src = h._source || {};
      return {
        _id: src._id ?? h._id,
        name: src.name ?? '',
        avatar: src.avatar ?? null,
        phone: src.phone ?? undefined,
      };
    });

    return { data, total: Number(total) };
  }
}
