import * as mongoose from 'mongoose';

import { Question } from '../models/Question';
import { Answer } from '../models/Answer';
import { Like } from '../models/Like';
import { logger } from '../utils/logger';

const lookupUser = (field) => [
  {
    $lookup: {
      from: 'users',
      localField: field,
      foreignField: '_id',
      as: field,
    },
  },
  {
    $unwind: '$createdBy',
  },
];

const lookupLiked = (field, userId) => [
  {
    $lookup: {
      from: 'likes',
      let: {
        match_id: '$_id',
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                {
                  $eq: ['$$match_id', field],
                },
                {
                  $eq: ['$likedBy', mongoose.Types.ObjectId(userId)],
                },
              ],
            },
          },
        },
      ],
      as: 'liked',
    },
  },
  {
    $unwind: {
      path: '$liked',
      preserveNullAndEmptyArrays: true,
    },
  },
];

export const getQuestions = async (req, res) => {
  const userId = req.user._id;

  try {
    res.formatter.ok(
      await Question.aggregate([
        ...lookupLiked('$question', userId),
        ...lookupUser('createdBy'),
        {
          $sort: { createdAt: -1 },
        },
      ])
    );
  } catch (err) {
    logger.error(err);
    res.formatter.serverError(err.message);
  }
};

export const getTopDiscussions = async (req, res) => {
  try {
    res.formatter.ok(
      await Question.aggregate([
        ...lookupUser('createdBy'),
        {
          $sort: { 'computed.answers': 1 },
        },
        {
          $limit: 5,
        },
      ])
    );
  } catch (err) {
    logger.error(err);
    res.formatter.serverError(err.message);
  }
};

export const getAnswersByQuestionId = async (req, res) => {
  const questionId = req.params.id;
  const userId = req.user._id;

  try {
    res.formatter.ok(
      await Answer.aggregate([
        {
          $match: {
            questionId: mongoose.Types.ObjectId(questionId),
          },
        },
        ...lookupLiked('$answer', userId),
        ...lookupUser('createdBy'),
        {
          $sort: { createdAt: -1 },
        },
      ])
    );
  } catch (err) {
    logger.error(err);
    res.formatter.serverError(err.message);
  }
};

export const getQuestionById = async (req, res) => {
  const userId = req.user._id;

  try {
    res.formatter.ok(
      (
        await Question.aggregate([
          {
            $match: {
              _id: mongoose.Types.ObjectId(req.params.id),
            },
          },
          ...lookupLiked('$question', userId),
          ...lookupUser('createdBy'),
        ])
      )[0]
    );
  } catch (err) {
    logger.error(err);
    res.formatter.serverError(err.message);
  }
};

export const createQuestion = async (req, res) => {
  const { title, body } = req.body;
  const user = req.user;

  try {
    res.formatter.ok(
      await new Question({
        title,
        body,
        createdBy: user._id,
      }).save()
    );
  } catch (err) {
    logger.error(err);
    res.formatter.serverError(err.message);
  }
};

export const createAnswer = async (req, res) => {
  const questionId = req.params.id;
  const { body } = req.body;
  const user = req.user;

  try {
    const answer = await new Answer({
      questionId,
      body,
      createdBy: user._id,
    }).save();

    await Question.findByIdAndUpdate(questionId, {
      $inc: {
        'computed.answers': 1,
      },
    });

    res.formatter.ok(answer);
  } catch (err) {
    logger.error(err);
    res.formatter.serverError(err.message);
  }
};

export const likeQuestion = async (req, res) => {
  const questionId = req.params.id;
  const user = req.user;

  try {
    let liked = await Like.findOne({
      question: questionId,
      likedBy: user._id,
    });

    if (liked) {
      await Like.deleteOne({
        question: questionId,
        likedBy: user._id,
      });
      liked = undefined;
    } else {
      liked = await new Like({
        question: questionId,
        likedBy: user._id,
      }).save();
    }

    res.formatter.ok({
      ...(await Question.findByIdAndUpdate(
        questionId,
        {
          $inc: { 'computed.likes': liked ? 1 : -1 },
        },
        { new: true }
      ).lean()),
      liked,
    });
  } catch (err) {
    logger.error(err);
    res.formatter.serverError(err.message);
  }
};

export const likeAnswer = async (req, res) => {
  const answerId = req.params.id;
  const user = req.user;

  try {
    let liked = await Like.findOne({
      answer: answerId,
      likedBy: user._id,
    });

    if (liked) {
      await Like.deleteOne({
        answer: answerId,
        likedBy: user._id,
      });
      liked = undefined;
    } else {
      liked = await new Like({
        answer: answerId,
        likedBy: user._id,
      }).save();
    }

    res.formatter.ok({
      ...(await Answer.findByIdAndUpdate(
        answerId,
        {
          $inc: { 'computed.likes': liked ? 1 : -1 },
        },
        { new: true }
      ).lean()),
      liked,
    });
  } catch (err) {
    logger.error(err);
    res.formatter.serverError(err.message);
  }
};
