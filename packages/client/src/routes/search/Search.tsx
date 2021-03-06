import React from 'react';
import _ from 'lodash';
import { useLocation } from 'react-router-dom';
import InfiniteScroll from 'react-infinite-scroll-component';

import { PreviewPost } from '../../components/Post/PreviewPost';
import { TopDiscussions } from '../../components/TopDiscussions/TopDiscussions';
import { useGetInfiniteSearch } from '../../actions/search.actions';

export const SearchRoute = () => {
  const location = useLocation();
  const query = new URLSearchParams(location.search).get('query');
  const perPage = 5;

  const { isLoading, isFetched, data, fetchNextPage } = useGetInfiniteSearch({
    query,
    perPage,
  });

  if (isLoading) {
    return <div>fetching...</div>;
  }

  const posts = _.flatten(data.pages);

  return (
    <div className="grid grid-cols-8 gap-4">
      <div className="col-span-6">
        <div>
          {isFetched && posts.length ? (
            <InfiniteScroll
              className="flex flex-col gap-5"
              dataLength={data.pages.length}
              next={fetchNextPage}
              hasMore={posts.length % perPage === 0}
              loader={<h4>Loading...</h4>}
              endMessage={
                <p className="text-center">
                  <b>Yay! You have seen it all</b>
                </p>
              }
            >
              {posts?.map((question, i) => (
                <PreviewPost {...question} key={i} />
              ))}
            </InfiniteScroll>
          ) : (
            <div>there is nothing here yet</div>
          )}
        </div>
      </div>
      <div className="col-span-2">
        <TopDiscussions />
      </div>
    </div>
  );
};
